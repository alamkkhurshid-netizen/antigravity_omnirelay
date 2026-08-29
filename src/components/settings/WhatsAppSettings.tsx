'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, CheckCircle2 } from 'lucide-react'
import { connectWhatsAppAccount } from '@/app/actions/whatsapp'

export default function WhatsAppSettings({ config }: { config: any }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const isConnected = !!config?.waba_id

  const handleConnect = async () => {
    setIsConnecting(true)
    
    // In production, this would open the Facebook Embedded Signup SDK pop-up:
    // FB.login(response => { ... }, { scope: 'whatsapp_business_management' })
    
    // For this MVP demonstration, we will simulate a successful connection return
    setTimeout(async () => {
      const mockWabaId = `waba_${Math.floor(Math.random() * 1000000)}`
      const mockPhoneId = `phone_${Math.floor(Math.random() * 1000000)}`
      const mockToken = `EAAMockToken...`

      const result = await connectWhatsAppAccount(mockWabaId, mockPhoneId, mockToken)
      
      if (result.error) {
        alert(result.error)
      } else {
        alert('Successfully connected to WhatsApp Business!')
      }
      
      setIsConnecting(false)
    }, 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Business Connection</CardTitle>
        <CardDescription>
          Connect your official WhatsApp Business Account to start sending automations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Account Connected</p>
              <p className="text-sm text-green-700 dark:text-green-300">WABA ID: {config.waba_id}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-zinc-500">
            <Phone className="w-5 h-5" />
            <p className="text-sm">No account connected yet.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting || isConnected}
          className="w-full sm:w-auto"
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect WhatsApp Account'}
        </Button>
      </CardFooter>
    </Card>
  )
}
