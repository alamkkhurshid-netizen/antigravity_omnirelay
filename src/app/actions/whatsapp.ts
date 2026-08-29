'use server'

import { createClient } from '@/utils/supabase/server'
import { exchangeTokenForSystemUser, subscribeAppToWaba } from '@/utils/meta'
import { revalidatePath } from 'next/cache'

export async function connectWhatsAppAccount(
  wabaId: string, 
  phoneNumberId: string, 
  accessToken: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get tenant ID
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) return { error: 'No tenant found' }
  const tenant_id = members[0].tenant_id

  try {
    // 1. Exchange the token (Mocked)
    const systemUserToken = await exchangeTokenForSystemUser(accessToken)

    // 2. Subscribe Webhooks (Mocked)
    await subscribeAppToWaba(wabaId, systemUserToken)

    // 3. Save to database
    const { error } = await supabase
      .from('tenant_whatsapp_configs')
      .upsert({
        tenant_id,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        system_user_token: systemUserToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' })

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
    
  } catch (error) {
    console.error('Failed to connect WhatsApp account:', error)
    return { error: 'Failed to connect account. Please try again.' }
  }
}
