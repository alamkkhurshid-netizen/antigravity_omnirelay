import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Megaphone, Users, CheckCircle2 } from 'lucide-react'
import { sendBroadcast } from '@/app/actions/broadcasts'

export default async function BroadcastsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get campaigns
  const { data: campaigns } = await supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // Get total audience size for preview
  const { count: audienceSize } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Broadcasts</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Composer Left Pane */}
        <Card className="h-fit">
          <form action={sendBroadcast}>
            <CardHeader>
              <CardTitle>New Campaign</CardTitle>
              <CardDescription>Blast a WhatsApp template to your audience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaign Name</label>
                <Input name="name" placeholder="e.g. Diwali Weekend Promo" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message Template</label>
                <Select name="templateName" required defaultValue="weekend_promo">
                  <SelectTrigger>
                    <SelectValue placeholder="Select an approved template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekend_promo">Weekend Promo (Marketing)</SelectItem>
                    <SelectItem value="feedback_request">Feedback Request (Utility)</SelectItem>
                    <SelectItem value="newsletter_update">Newsletter Update (Marketing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md border flex items-center gap-3">
                <Users className="w-5 h-5 text-zinc-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Audience</p>
                  <p className="text-xs text-zinc-500">All Contacts ({audienceSize || 0})</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full gap-2">
                <Megaphone className="w-4 h-4" />
                Send Broadcast Now
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* History Right Pane */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Campaign History</h2>
          {campaigns?.length === 0 ? (
            <Card className="border-dashed bg-zinc-50/50">
              <CardContent className="p-12 text-center text-zinc-500">
                You haven't sent any broadcasts yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {campaigns?.map(campaign => (
                <Card key={campaign.id}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription>Template: {campaign.template_name}</CardDescription>
                    </div>
                    <Badge variant="outline" className={campaign.status === 'sent' ? 'bg-green-500/10 text-green-600' : ''}>
                      {campaign.status.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>Sent to {campaign.sent_count} contacts</span>
                      </div>
                      {campaign.status === 'sent' && (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>100% Delivered</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
