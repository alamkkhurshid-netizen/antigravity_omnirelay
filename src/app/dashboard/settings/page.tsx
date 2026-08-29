import { createClient } from '@/utils/supabase/server'
import WhatsAppSettings from '@/components/settings/WhatsAppSettings'

export default async function SettingsPage() {
  const supabase = await createClient()

  // Get tenant ID
  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get WhatsApp config
  const { data: config } = await supabase
    .from('tenant_whatsapp_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="max-w-2xl">
        <WhatsAppSettings config={config} />
      </div>
    </div>
  )
}
