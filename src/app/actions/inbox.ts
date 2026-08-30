'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendWhatsAppMessage } from '@/utils/meta'
import { debitWalletForMessage } from '@/utils/billing'
import { revalidatePath } from 'next/cache'

export async function getMessages(contactId: string) {
  const supabase = await createClient()
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { messages: messages || [] }
}

export async function sendManualReply(contactId: string, messageText: string) {
  const supabase = await createClient()
  const admin = createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) return { error: 'No workspace found' }
  const tenantId = members[0].tenant_id

  // Get contact phone number
  const { data: contact } = await supabase
    .from('contacts')
    .select('phone_number')
    .eq('id', contactId)
    .single()

  if (!contact || !contact.phone_number) return { error: 'Contact has no phone number' }

  // Get WhatsApp config
  const { data: waConfig } = await supabase
    .from('tenant_whatsapp_configs')
    .select('phone_number_id, system_user_token')
    .eq('tenant_id', tenantId)
    .single()

  if (!waConfig || !waConfig.phone_number_id || !waConfig.system_user_token) {
    return { error: 'WhatsApp not connected. Go to Settings to connect.' }
  }

  try {
    // Send via Graph API
    await sendWhatsAppMessage(waConfig.phone_number_id, contact.phone_number, messageText, waConfig.system_user_token)

    // Log outbound message (use admin to bypass RLS for insert)
    const { data: msgRec } = await admin
      .from('messages')
      .insert({
        contact_id: contactId,
        direction: 'outbound',
        content: messageText,
        status: 'sent',
        channel: 'whatsapp'
      })
      .select('id')
      .single()

    // Debit wallet
    if (msgRec) {
      await debitWalletForMessage(tenantId, msgRec.id, 'service')
    }

    revalidatePath('/dashboard/inbox')
    return { success: true }
  } catch (err: any) {
    console.error('Manual reply error:', err)
    return { error: err.message || 'Failed to send message' }
  }
}
