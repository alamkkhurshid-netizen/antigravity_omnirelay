import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import Script from 'next/script'
import { WhatsAppSignupButton } from './WhatsAppSignupButton'

export default async function WhatsAppSettingsPage() {
  const supabase = await createClient()

  // Get current tenant
  const { data: { user } } = await supabase.auth.getUser()
  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .single()
    
  let isConnected = false
  let configDetails = null

  if (member) {
    const { data: config } = await supabase
      .from('tenant_whatsapp_configs')
      .select('*')
      .eq('tenant_id', member.tenant_id)
      .single()
      
    if (config && config.phone_number_id && config.system_user_token) {
      isConnected = true
      configDetails = config
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business API Connection</CardTitle>
          <CardDescription>
            Connect your WhatsApp Business number to Omnirelay to enable automation flows and unified inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isConnected ? (
            <div className="rounded-lg border p-4 bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-300">Successfully Connected</h3>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Phone Number ID: {configDetails?.phone_number_id}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border p-4 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900 dark:text-amber-300">Not Connected</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 mb-4">
                    You need to link your WhatsApp Business Account. Click the button below to launch the Meta Embedded Signup flow.
                  </p>
                  <WhatsAppSignupButton tenantId={member?.tenant_id} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Load Meta SDK */}
      <Script 
        strategy="afterInteractive" 
        src="https://connect.facebook.net/en_US/sdk.js" 
        onLoad={() => {
          // Initialize SDK
          if (window.FB) {
            window.FB.init({
              appId: process.env.NEXT_PUBLIC_META_APP_ID || '',
              autoLogAppEvents: true,
              xfbml: true,
              version: 'v20.0'
            })
          }
        }}
      />
    </div>
  )
}
