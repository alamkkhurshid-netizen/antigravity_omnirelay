'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react'
import { connectWhatsAppAccount } from '@/app/actions/whatsapp'

export default function WhatsAppSettings({ config }: { config: any }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const isConnected = !!config?.waba_id

  // Attempt Embedded Signup via Facebook JS SDK
  const handleEmbeddedSignup = async () => {
    setIsConnecting(true)
    setError(null)

    // Check if FB SDK is loaded
    if (typeof window !== 'undefined' && (window as any).FB) {
      ;(window as any).FB.login(
        (response: any) => {
          if (response.authResponse) {
            const accessToken = response.authResponse.accessToken
            // After FB login, user must provide WABA ID and Phone Number ID
            // These come from the Embedded Signup callback data
            // For now, show a form to collect them after successful OAuth
            setShowManualForm(true)
            // Store the token temporarily
            sessionStorage.setItem('fb_access_token', accessToken)
          } else {
            setError('Facebook login was cancelled or failed.')
          }
          setIsConnecting(false)
        },
        {
          config_id: process.env.NEXT_PUBLIC_FB_CONFIG_ID || '', // Facebook Login Configuration ID
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: '',
            sessionInfoVersion: '3',
          },
        }
      )
    } else {
      // FB SDK not loaded — fall back to manual form
      setShowManualForm(true)
      setIsConnecting(false)
    }
  }

  // Manual connection form submission
  const handleManualConnect = async (formData: FormData) => {
    setIsConnecting(true)
    setError(null)

    const wabaId = formData.get('wabaId') as string
    const phoneNumberId = formData.get('phoneNumberId') as string
    const accessToken = formData.get('accessToken') as string || sessionStorage.getItem('fb_access_token') || ''

    if (!wabaId || !phoneNumberId || !accessToken) {
      setError('All fields are required.')
      setIsConnecting(false)
      return
    }

    const result = await connectWhatsAppAccount(wabaId, phoneNumberId, accessToken)

    if (result.error) {
      setError(result.error)
    } else {
      setError(null)
      // Force reload to show connected state
      window.location.reload()
    }
    setIsConnecting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Business Connection</CardTitle>
        <CardDescription>
          Connect your official WhatsApp Business Account to start sending automations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Account Connected</p>
              <p className="text-sm text-green-700 dark:text-green-300">WABA ID: {config.waba_id}</p>
              <p className="text-sm text-green-700 dark:text-green-300">Phone Number ID: {config.phone_number_id}</p>
            </div>
          </div>
        ) : showManualForm ? (
          <form action={handleManualConnect as any} className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              Enter your WhatsApp Business API credentials from <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noopener noreferrer" className="underline font-medium">Meta Business Suite</a>.
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wabaId">WABA ID</Label>
              <Input id="wabaId" name="wabaId" placeholder="e.g. 123456789012345" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input id="phoneNumberId" name="phoneNumberId" placeholder="e.g. 109876543210987" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accessToken">Permanent Access Token</Label>
              <Input id="accessToken" name="accessToken" type="password" placeholder="Paste your System User token" required />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect Account'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowManualForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-zinc-500">
            <Phone className="w-5 h-5" />
            <p className="text-sm">No account connected yet.</p>
          </div>
        )}
      </CardContent>
      {!isConnected && !showManualForm && (
        <CardFooter className="flex flex-col gap-2 items-start">
          <Button
            onClick={handleEmbeddedSignup}
            disabled={isConnecting}
            className="w-full sm:w-auto"
          >
            {isConnecting ? 'Connecting...' : 'Connect with Facebook (Embedded Signup)'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowManualForm(true)}
            className="w-full sm:w-auto"
          >
            Connect Manually (WABA ID + Token)
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
