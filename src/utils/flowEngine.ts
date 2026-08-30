import { createAdminClient } from '@/utils/supabase/admin'
import { sendWhatsAppMessage, sendWhatsAppInteractiveMessage } from './meta'
import { debitWalletForMessage, checkWalletBalance } from './billing'

export async function executeFlow(tenantId: string, contactId: string, incomingMessageText: string, contactPhone: string) {
  const supabase = createAdminClient()

  try {
    // 1. Get Conversation State
    let { data: state } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('contact_id', contactId)
      .single()

    let flowId = state?.active_flow_id
    let currentNodeId = state?.current_node_id
    let isNewFlow = false

    // 2. If no state, find the active flow for the tenant
    if (!state) {
      const { data: activeFlow } = await supabase
        .from('flows')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (!activeFlow) {
        console.log(`No active flow found for tenant ${tenantId}. Ignoring message.`)
        return
      }

      flowId = activeFlow.id
      isNewFlow = true
    }

    // 3. Load Flow Version (nodes & edges)
    const { data: flowVersion } = await supabase
      .from('flow_versions')
      .select('nodes, edges')
      .eq('flow_id', flowId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!flowVersion) {
      console.error(`Flow version not found for flow ${flowId}`)
      return
    }

    const nodes = flowVersion.nodes as any[]
    const edges = flowVersion.edges as any[]

    // 4. Determine starting point
    if (isNewFlow) {
      const triggerNode = nodes.find(n => n.type === 'trigger' || n.type === 'TriggerNode')
      if (!triggerNode) {
        console.error('No trigger node found in flow.')
        return
      }
      currentNodeId = triggerNode.id
      
      // Upsert new state
      const { data: newState } = await supabase.from('conversation_states').upsert({
        tenant_id: tenantId,
        contact_id: contactId,
        active_flow_id: flowId,
        current_node_id: currentNodeId,
        variables: {}
      }).select().single()
      
      state = newState
    } else if (state?.current_node_id) {
      // If we are resuming from a node that captures input, process the input
      const currentNode = nodes.find(n => n.id === state.current_node_id)
      if (currentNode && (currentNode.type === 'inputCapture' || currentNode.type === 'InputCaptureNode')) {
        const varName = currentNode.data?.variable || 'input'
        
        // Save the input to variables
        const updatedVariables = { ...state.variables, [varName as string]: incomingMessageText }
        
        await supabase.from('conversation_states').update({
          variables: updatedVariables
        }).eq('id', state.id)
        
        state.variables = updatedVariables
        
        // Move to the next node and continue
        const edge = edges.find(e => e.source === currentNode.id)
        currentNodeId = edge ? edge.target : null
      }
    }

    // 5. Execution Loop
    let hasConsumedInput = false
    let maxSteps = 20 // prevent infinite loops
    let steps = 0

    while (currentNodeId && steps < maxSteps) {
      steps++
      const currentNode = nodes.find(n => n.id === currentNodeId)
      if (!currentNode) break

      let nextNodeId: string | null = null

      if (currentNode.type === 'trigger' || currentNode.type === 'TriggerNode') {
        // Just move to the next connected node
        const edge = edges.find(e => e.source === currentNode.id)
        nextNodeId = edge ? edge.target : null
      } 
      else if (currentNode.type === 'message' || currentNode.type === 'MessageNode') {
        // Send WhatsApp Message
        const messageText = currentNode.data?.label || 'Hello!'
        
        // Get tenant WhatsApp config
        const { data: waConfig } = await supabase
          .from('tenant_whatsapp_configs')
          .select('phone_number_id, system_user_token')
          .eq('tenant_id', tenantId)
          .single()

        if (waConfig && waConfig.phone_number_id && waConfig.system_user_token) {
          // Check billing BEFORE send
          const hasBalance = await checkWalletBalance(tenantId, 'utility')
          
          if (!hasBalance) {
            console.error(`Insufficient balance for tenant ${tenantId}. Message blocked.`)
            
            // Log as failed
            await supabase.from('messages').insert({
              contact_id: contactId,
              direction: 'outbound',
              content: messageText,
              status: 'failed',
              channel: 'whatsapp'
            })
            break // Stop flow execution
          }

          try {
            await sendWhatsAppMessage(waConfig.phone_number_id, contactPhone, messageText, waConfig.system_user_token)
            
            // Log outbound message
            const { data: msgRec } = await supabase.from('messages').insert({
              contact_id: contactId,
              direction: 'outbound',
              content: messageText,
              status: 'sent',
              channel: 'whatsapp'
            }).select('id').single()

            if (msgRec) {
              await debitWalletForMessage(tenantId, msgRec.id, 'utility')
            }
          } catch (err) {
            console.error('Failed to send message node:', err)
          }
        }

        // Move to next node
        const edge = edges.find(e => e.source === currentNode.id)
        nextNodeId = edge ? edge.target : null
      }
      else if (currentNode.type === 'condition' || currentNode.type === 'ConditionNode') {
        if (!hasConsumedInput) {
          // Evaluate condition against incomingMessageText
          const conditionText = (currentNode.data?.label || '').toLowerCase()
          const isMatch = incomingMessageText.toLowerCase().includes(conditionText)
          
          hasConsumedInput = true
          
          // Find the correct edge based on true/false handle
          const sourceHandle = isMatch ? 'true' : 'false'
          const edge = edges.find(e => e.source === currentNode.id && e.sourceHandle === sourceHandle)
          
          nextNodeId = edge ? edge.target : null
        } else {
          // We already used the incoming message in a previous node. We must stop and wait for a new message.
          break
        }
      }
      else if (currentNode.type === 'inputCapture' || currentNode.type === 'InputCaptureNode') {
        // Stop execution and wait for next user message
        // The message will be captured in the next execution run
        break
      }
      else if (currentNode.type === 'interactiveList' || currentNode.type === 'InteractiveListNode') {
        // Send WhatsApp Interactive Message
        const messageText = currentNode.data?.label || 'Please select an option'
        
        // Parse options from data (assumes a comma separated string for simplicity in MVP, e.g. "Dr. Smith, Dr. Jones, Dr. Brown")
        const optionsStr = currentNode.data?.options || 'Option 1, Option 2, Option 3'
        const optionsList = (optionsStr as string).split(',').map(s => s.trim()).slice(0, 10) // Max 10 options for WhatsApp list
        
        // Construct interactive payload
        const interactivePayload = {
          type: "list",
          header: { type: "text", text: "Options" },
          body: { text: messageText },
          footer: { text: "Select an item below" },
          action: {
            button: "Select",
            sections: [
              {
                title: "Available Options",
                rows: optionsList.map((opt, i) => ({
                  id: `opt_${i}`,
                  title: opt.substring(0, 24) // WhatsApp title limit is 24 chars
                }))
              }
            ]
          }
        }

        // Get tenant WhatsApp config
        const { data: waConfig } = await supabase
          .from('tenant_whatsapp_configs')
          .select('phone_number_id, system_user_token')
          .eq('tenant_id', tenantId)
          .single()

        if (waConfig && waConfig.phone_number_id && waConfig.system_user_token) {
          // Check billing BEFORE send
          const hasBalance = await checkWalletBalance(tenantId, 'utility')
          
          if (!hasBalance) {
            console.error(`Insufficient balance for tenant ${tenantId}. Message blocked.`)
            // Log as failed
            await supabase.from('messages').insert({
              contact_id: contactId, direction: 'outbound', content: messageText, status: 'failed', channel: 'whatsapp'
            })
            break // Stop flow execution
          }

          try {
            await sendWhatsAppInteractiveMessage(waConfig.phone_number_id, contactPhone, interactivePayload, waConfig.system_user_token)
            
            // Log outbound message
            const { data: msgRec } = await supabase.from('messages').insert({
              contact_id: contactId, direction: 'outbound', content: messageText, status: 'sent', channel: 'whatsapp'
            }).select('id').single()

            if (msgRec) {
              await debitWalletForMessage(tenantId, msgRec.id, 'utility')
            }
          } catch (err) {
            console.error('Failed to send interactive node:', err)
          }
        }

        // Move to next node
        const edge = edges.find(e => e.source === currentNode.id)
        nextNodeId = edge ? edge.target : null
      }
      else if (currentNode.type === 'databaseAction' || currentNode.type === 'DatabaseActionNode') {
        const targetTable = currentNode.data?.targetTable || currentNode.data?.table || 'restaurant_bookings'
        
        try {
          if (targetTable === 'restaurant_bookings') {
            // Needs date, time, party_size
            const date = state.variables['date'] || new Date().toISOString().split('T')[0]
            const time = state.variables['time'] || '19:00:00'
            const party_size = parseInt(state.variables['party_size'] || '2', 10)
            
            await supabase.from('restaurant_bookings').insert({
              tenant_id: tenantId,
              contact_id: contactId,
              booking_date: date,
              booking_time: time,
              party_size: party_size,
              status: 'pending'
            })
          } else if (targetTable === 'clinic_appointments') {
            // Needs date, time, doctor_id
            const date = state.variables['date'] || new Date().toISOString().split('T')[0]
            const time = state.variables['time'] || '10:00:00'
            
            // For MVP we can just fetch the first doctor if doctor_id isn't in state
            let doctorId = state.variables['doctor_id']
            if (!doctorId) {
              const { data: doc } = await supabase.from('doctors').select('id').eq('tenant_id', tenantId).limit(1).single()
              doctorId = doc?.id
            }

            if (doctorId) {
              await supabase.from('clinic_appointments').insert({
                tenant_id: tenantId,
                contact_id: contactId,
                doctor_id: doctorId,
                appointment_date: date,
                appointment_time: time,
                status: 'pending'
              })
            }
          } else if (targetTable === 'retail_orders') {
            const item = state.variables['input'] || 'Unknown Item'
            
            await supabase.from('retail_orders').insert({
              tenant_id: tenantId,
              customer_phone: contactPhone,
              order_details: { items: [item] },
              total_amount: 0.00,
              status: 'pending'
            })
          }
          console.log(`Successfully saved to ${targetTable}`)
        } catch (err) {
          console.error(`Failed to save to ${targetTable}:`, err)
        }

        // Move to next node
        const edge = edges.find(e => e.source === currentNode.id)
        nextNodeId = edge ? edge.target : null
      }

      // Advance
      currentNodeId = nextNodeId
    }

    // 6. Finalize State
    if (currentNodeId) {
      // Save state to resume later
      await supabase.from('conversation_states').update({
        current_node_id: currentNodeId,
        updated_at: new Date().toISOString()
      }).eq('id', state.id)
    } else {
      // Flow completed, clear state
      await supabase.from('conversation_states').delete().eq('id', state.id)
    }

  } catch (error) {
    console.error('Flow Execution Error:', error)
  }
}
