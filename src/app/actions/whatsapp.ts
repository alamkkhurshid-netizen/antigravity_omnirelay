'use server'

import { createClient } from '@/utils/supabase/server'

export async function saveWhatsAppConfig(code: string, tenantId?: string) {
  if (!tenantId) {
    return { success: false, error: 'No tenant specified' }
  }

  const supabase = await createClient()

  try {
    // 1. Exchange the OAuth code for an access token
    // In Meta Embedded Signup, the response is often an OAuth code that you exchange for a system user token.
    // For MVP simulation, we assume the frontend already obtained the token or we do the exchange here.
    // For now, this is a placeholder where you would call the Meta Graph API to exchange the token and get the WABA ID.
    
    console.log('Received auth code from Meta:', code)

    // TODO: 
    // const tokenResponse = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?...`)
    // const systemUserToken = tokenResponse.access_token

    // Mocking the successful fetch of phone number ID and token for MVP
    const mockPhoneNumberId = '1234567890' 
    const mockSystemUserToken = code 
    const mockWabaId = '0987654321'

    const { error } = await supabase
      .from('tenant_whatsapp_configs')
      .upsert({
        tenant_id: tenantId,
        phone_number_id: mockPhoneNumberId,
        waba_id: mockWabaId,
        system_user_token: mockSystemUserToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' })

    if (error) {
      console.error('DB Error saving whatsapp config:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Failed to save whatsapp config:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}
