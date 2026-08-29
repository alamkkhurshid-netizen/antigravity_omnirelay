import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify the user has a tenant workspace
  const { data: members, error } = await supabase
    .from('tenant_members')
    .select('tenants(id, name, slug), role')
    .eq('user_id', user.id)
    .limit(1)

  if (error || !members || members.length === 0) {
    // Force onboarding if they don't have a workspace
    redirect('/onboarding')
  }

  const workspace = members[0].tenants

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white dark:bg-zinc-900 px-4 md:px-6">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-lg">Omnirelay</span>
            <span className="text-zinc-400">/</span>
            <span className="text-zinc-600 dark:text-zinc-300">
              {/* @ts-ignore - Supabase type casting quirk */}
              {workspace?.name || 'Workspace'}
            </span>
          </div>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
