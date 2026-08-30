'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendWhatsAppMessage } from '@/utils/meta'
import { debitWalletForMessage, checkWalletBalance } from '@/utils/billing'

export async function sendBroadcast(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const messageBody = formData.get('messageBody') as string

  if (!name || !messageBody) {
    return { error: 'Campaign name and message body are required' }
  }

  // Get user's tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) {
    return { error: 'User does not belong to a workspace' }
  }

  const tenantId = members[0].tenant_id

  // Get WhatsApp config
  const { data: waConfig } = await supabase
    .from('tenant_whatsapp_configs')
    .select('phone_number_id, system_user_token')
    .eq('tenant_id', tenantId)
    .single()

  if (!waConfig || !waConfig.phone_number_id || !waConfig.system_user_token) {
    return { error: 'WhatsApp not connected. Go to Settings to connect first.' }
  }

  // 1. Create Broadcast Campaign
  const { data: campaign, error } = await supabase
    .from('broadcast_campaigns')
    .insert([{ 
      tenant_id: tenantId, 
      name, 
      template_name: messageBody.substring(0, 50),
      status: 'sending' 
    }])
    .select('id')
    .single()

  if (error || !campaign) {
    return { error: 'Failed to create campaign' }
  }

  // 2. Fetch all contacts with phone numbers for this tenant
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, phone_number')
    .eq('tenant_id', tenantId)
    .not('phone_number', 'is', null)

  if (!contacts || contacts.length === 0) {
    await supabase
      .from('broadcast_campaigns')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', campaign.id)
    return { error: 'No contacts with phone numbers found' }
  }

  // 3. Send to each contact
  let sentCount = 0
  let failedCount = 0

  for (const contact of contacts) {
    const hasBalance = await checkWalletBalance(tenantId, 'marketing')
    if (!hasBalance) {
      console.error(`Broadcast stopped due to insufficient balance for tenant ${tenantId}`)
      failedCount += (contacts.length - sentCount - failedCount) // mark remaining as failed
      break
    }

    try {
      await sendWhatsAppMessage(
        waConfig.phone_number_id,
        contact.phone_number!,
        messageBody,
        waConfig.system_user_token
      )

      // Log outbound message
      const { data: msgRec } = await admin
        .from('messages')
        .insert({
          contact_id: contact.id,
          direction: 'outbound',
          content: messageBody,
          status: 'sent',
          channel: 'whatsapp'
        })
        .select('id')
        .single()

      // Debit wallet (marketing category for broadcasts)
      if (msgRec) {
        await debitWalletForMessage(tenantId, msgRec.id, 'marketing')
      }

      sentCount++
    } catch (err) {
      console.error(`Failed to send broadcast to ${contact.phone_number}:`, err)
      failedCount++
    }
  }

  // 4. Update campaign status
  await supabase
    .from('broadcast_campaigns')
    .update({ 
      status: failedCount === contacts.length ? 'failed' : 'sent',
      sent_count: sentCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaign.id)

  revalidatePath('/dashboard/broadcasts')
  return { success: true, count: sentCount, failed: failedCount }
}
