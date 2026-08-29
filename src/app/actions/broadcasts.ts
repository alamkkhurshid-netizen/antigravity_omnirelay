'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function sendBroadcast(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const templateName = formData.get('templateName') as string

  if (!name || !templateName) {
    return { error: 'Campaign name and Template are required' }
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

  // 1. Create Broadcast Campaign
  const { data: campaign, error } = await supabase
    .from('broadcast_campaigns')
    .insert([{ 
      tenant_id: tenantId, 
      name, 
      template_name: templateName,
      status: 'sending' 
    }])
    .select('id')
    .single()

  if (error || !campaign) {
    return { error: 'Failed to create campaign' }
  }

  // 2. Fetch all contacts for this tenant (Simulating audience targeting)
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, phone_number')
    .eq('tenant_id', tenantId)

  const contactCount = contacts?.length || 0

  // 3. Simulate sending the broadcast (In prod, this goes to a Redis/BullMQ worker queue)
  console.log(`[Broadcast Engine] Dispatching campaign "${name}" to ${contactCount} contacts using template "${templateName}"`)
  
  // Update status to sent
  await supabase
    .from('broadcast_campaigns')
    .update({ 
      status: 'sent',
      sent_count: contactCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaign.id)

  revalidatePath('/dashboard/broadcasts')
  return { success: true, count: contactCount }
}
