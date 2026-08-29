import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, Trash2, Terminal, ExternalLink } from 'lucide-react'
import { generateApiKey, revokeApiKey } from '@/app/actions/developer'

export default async function DeveloperPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get active API keys
  const { data: apiKeys } = await supabase
    .from('tenant_api_keys')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Developer Settings</h1>
      </div>
      <p className="text-zinc-500 max-w-3xl">
        Generate API keys to authenticate with Omnirelay's Open API. Connect to Zapier, Make.com, HubSpot, or your own custom backend.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Left Pane: Generator */}
        <Card className="h-fit">
          <form action={generateApiKey as any}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Generate New Key
              </CardTitle>
              <CardDescription>Create a secret token to authenticate requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Name</label>
                <Input name="name" placeholder="e.g. Zapier Integration" required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Create Secret Key
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Right Pane: Key List & Docs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              {apiKeys?.length === 0 ? (
                <div className="text-center text-sm text-zinc-500 py-6">
                  No API keys generated yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys?.map(key => (
                    <div key={key.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium text-sm">{key.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300">
                            {key.key_hash.substring(0, 10)}************************
                          </code>
                        </div>
                      </div>
                      <form action={revokeApiKey as any}>
                        <input type="hidden" name="keyId" value={key.id} />
                        <Button type="submit" variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <Terminal className="w-5 h-5" />
                API Quickstart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-zinc-950 rounded-md p-4 overflow-x-auto text-sm font-mono text-zinc-300">
                <p className="text-zinc-500 mb-2"># Fetch your CRM contacts</p>
                <p>curl -X GET https://api.omnirelay.com/v1/contacts \</p>
                <p className="pl-4">-H "Authorization: Bearer or_your_secret_key"</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
