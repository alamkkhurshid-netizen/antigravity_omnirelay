'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { saveWhatsAppConfig } from '@/app/actions/whatsapp'

export function WhatsAppSignupButton({ tenantId }: { tenantId?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignup = () => {
    setIsLoading(true)
    
    // Fallback if FB SDK didn't load
    if (typeof window === 'undefined' || !window.FB) {
      console.error('Facebook SDK not loaded')
      setIsLoading(false)
      return
    }

    // Launch Meta Embedded Signup
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken
          
          // Send the access token to our backend to exchange for long-lived token
          // and fetch the WABA ID, Phone Number ID
          saveWhatsAppConfig(accessToken, tenantId)
            .then((result) => {
              if (result.success) {
                router.refresh()
              } else {
                console.error('Failed to save config:', result.error)
              }
            })
            .finally(() => {
              setIsLoading(false)
            })
        } else {
          console.log('User cancelled login or did not fully authorize.')
          setIsLoading(false)
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '2'
        }
      }
    )
  }

  return (
    <Button onClick={handleSignup} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4 mr-2 fill-current" />
      )}
      Connect WhatsApp Business
    </Button>
  )
}
