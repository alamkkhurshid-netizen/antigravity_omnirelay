import { createClient } from '@/utils/supabase/server'
import InboxClient from '@/components/inbox/InboxClient'

export default async function InboxPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, phone_number, instagram_id, updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  return <InboxClient contacts={contacts || []} />
}
