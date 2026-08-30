import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { executeFlow } from '@/utils/flowEngine'

// GET handler for Meta Webhook Verification
export async function GET(request: Request) {
  const url = new URL(request.url)
  
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED')
      return new NextResponse(challenge, { status: 200 })
    } else {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  return new NextResponse('Bad Request', { status: 400 })
}

// POST handler for receiving WhatsApp messages and statuses
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Incoming Webhook Payload:', JSON.stringify(body, null, 2))

    if (body.object === 'whatsapp_business_account') {
      const supabase = createAdminClient()

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            const phoneNumberId = change.value.metadata.phone_number_id
            const message = change.value.messages[0]
            const contactPhone = message.from
            const contactName = change.value.contacts?.[0]?.profile?.name || 'Unknown'
            const messageText = message.text?.body || ''

            // 1. Identify Tenant
            const { data: config } = await supabase
              .from('tenant_whatsapp_configs')
              .select('tenant_id')
              .eq('phone_number_id', phoneNumberId)
              .single()

            if (!config) continue
            const tenantId = config.tenant_id

            // 2. Upsert Contact
            const { data: contact } = await supabase
              .from('contacts')
              .upsert(
                { tenant_id: tenantId, phone_number: contactPhone, name: contactName, updated_at: new Date().toISOString() },
                { onConflict: 'tenant_id,phone_number' }
              )
              .select('id')
              .single()

            if (!contact) continue

            // 3. Save Message to Inbox
            await supabase
              .from('messages')
              .insert({
                contact_id: contact.id,
                direction: 'inbound',
                content: messageText,
                status: 'received'
              })

            // 4. Trigger Actual Flow Engine
            console.log(`[Flow Engine] Executing flow for ${contactPhone}...`)
            await executeFlow(tenantId, contact.id, messageText, contactPhone)
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 })
    } 
    else if (body.object === 'instagram') {
      const supabase = createAdminClient()

      for (const entry of body.entry) {
        // We assume the first messaging event is a text message from a user
        const messaging = entry.messaging?.[0]
        if (messaging && messaging.message && !messaging.message.is_echo) {
          const instagramId = messaging.sender.id
          const messageText = messaging.message.text || ''
          
          // In a production environment, we would look up the tenant by their instagram_page_id.
          // For MVP simulation, we'll assign it to the first tenant we find.
          const { data: firstTenant } = await supabase
            .from('tenants')
            .select('id')
            .limit(1)
            .single()

          if (!firstTenant) continue
          const tenantId = firstTenant.id

          // Upsert Contact based on instagram_id
          const { data: contact } = await supabase
            .from('contacts')
            .upsert(
              { tenant_id: tenantId, instagram_id: instagramId, name: `IG User ${instagramId.substring(0,4)}`, updated_at: new Date().toISOString() },
              { onConflict: 'tenant_id,instagram_id' }
            )
            .select('id')
            .single()

          if (!contact) continue

          // Save Message to Inbox with channel 'instagram'
          await supabase
            .from('messages')
            .insert({
              contact_id: contact.id,
              direction: 'inbound',
              content: messageText,
              status: 'received',
              channel: 'instagram'
            })
            
          console.log(`[Flow Engine] Instagram DM received from ${instagramId}.`)
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 })
    }
    else {
      return new NextResponse('Not Found', { status: 404 })
    }
  } catch (error) {
    console.error('Webhook Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
