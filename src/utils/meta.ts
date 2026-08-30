/**
 * Meta API Adapters (Open-BSP Pattern)
 * 
 * In production, you would need:
 * 1. META_APP_ID
 * 2. META_APP_SECRET
 * 3. A System User Token or your own App's access token
 */

export async function exchangeTokenForSystemUser(accessToken: string) {
  // Exchange standard OAuth token for a long-lived System User token (Embedded Signup flow)
  console.log('Exchanging OAuth token for System User Token...')
  
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  
  if (!appId || !appSecret) {
    throw new Error('Missing META_APP_ID or META_APP_SECRET in environment')
  }

  const response = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
  )

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error.message || 'Failed to exchange token')
  }

  return data.access_token as string
}

export async function subscribeAppToWaba(wabaId: string, systemUserToken: string) {
  console.log(`Subscribing App to WABA: ${wabaId}...`)
  
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${systemUserToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error.message || 'Failed to subscribe app to WABA')
  }

  return data
}

export async function sendWhatsAppMessage(phoneNumberId: string, toPhone: string, messageText: string, token: string) {
  console.log(`Sending WhatsApp message to ${toPhone} via ${phoneNumberId}...`)
  
  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText
      }
    })
  })

  const data = await response.json()
  
  if (data.error) {
    console.error('Meta API Error:', data.error)
    throw new Error(data.error.message || 'Failed to send WhatsApp message')
  }
  
  return data
}

export async function sendWhatsAppInteractiveMessage(phoneNumberId: string, toPhone: string, interactivePayload: any, token: string) {
  console.log(`Sending WhatsApp interactive message to ${toPhone} via ${phoneNumberId}...`)
  
  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'interactive',
      interactive: interactivePayload
    })
  })

  const data = await response.json()
  
  if (data.error) {
    console.error('Meta API Error:', data.error)
    throw new Error(data.error.message || 'Failed to send WhatsApp interactive message')
  }
  
  return data
}
