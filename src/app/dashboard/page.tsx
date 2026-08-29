import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { MessageSquare, Users, BookOpen, CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // 1. Fetch Analytics
  const [{ count: contactsCount }, { count: messagesCount }, { count: bookingsCount }] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('messages').select('id', { count: 'exact', head: true }), // Using simplified count for MVP
    supabase.from('restaurant_bookings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
  ])

  // 2. Determine Setup Progress
  const { data: waConfig } = await supabase
    .from('tenant_whatsapp_configs')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  const { data: flows } = await supabase
    .from('flows')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)

  const isWaConnected = !!waConfig
  const isFlowCreated = flows && flows.length > 0
  
  const setupProgress = (isWaConnected ? 50 : 0) + (isFlowCreated ? 50 : 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-zinc-500">Welcome back! Here is what's happening with your Omnirelay bot.</p>
      </div>

      {/* Analytics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactsCount || 0}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Unique customers in your CRM</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Exchanged</CardTitle>
            <MessageSquare className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messagesCount || 0}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total inbound & outbound</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookOpen className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingsCount || 0}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Across all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Setup Assistant Widget */}
      {setupProgress < 100 && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Setup Assistant</CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">Complete these steps to launch your AI Assistant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-blue-100 dark:bg-blue-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: `${setupProgress}%` }} 
              />
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {isWaConnected ? <CheckCircle2 className="text-green-500 w-5 h-5" /> : <Circle className="text-blue-300 w-5 h-5" />}
                <span className={isWaConnected ? "text-zinc-500 line-through" : "font-medium"}>
                  Connect WhatsApp Business Account
                </span>
                {!isWaConnected && (
                  <Button variant="link" className="ml-auto text-blue-600 p-0 h-auto">
                    <Link href="/dashboard/settings">Connect &rarr;</Link>
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {isFlowCreated ? <CheckCircle2 className="text-green-500 w-5 h-5" /> : <Circle className="text-blue-300 w-5 h-5" />}
                <span className={isFlowCreated ? "text-zinc-500 line-through" : "font-medium"}>
                  Create your first automation Flow
                </span>
                {!isFlowCreated && (
                  <Button variant="link" className="ml-auto text-blue-600 p-0 h-auto">
                    <Link href="/dashboard/flows">Create Flow &rarr;</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
