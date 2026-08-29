import { createTenant } from '@/app/actions/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
    redirect('/dashboard') // Already onboarded
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl tracking-tight font-bold">Set up your workspace</CardTitle>
          <CardDescription>
            Welcome to Omnirelay! Let's start by creating a workspace for your business.
          </CardDescription>
        </CardHeader>
        <form action={createTenant}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder="e.g. Apex Clinic, Luigi's Pizza"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">
              Create Workspace
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
