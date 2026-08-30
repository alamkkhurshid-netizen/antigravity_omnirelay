import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if they already have a tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (members && members.length > 0) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl tracking-tight font-bold">Set up your workspace</CardTitle>
          <CardDescription>
            Welcome to Omnirelay! Tell us about your business so we can pre-configure your AI assistant.
          </CardDescription>
        </CardHeader>
        <OnboardingForm />
      </Card>
    </div>
  )
}
