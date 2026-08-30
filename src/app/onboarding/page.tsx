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
        <form action={createTenant as any}>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder="e.g. Apex Clinic, Luigi's Pizza"
                required
              />
            </div>

            <div className="grid gap-3">
              <Label>What type of business do you run?</Label>
              <div className="grid grid-cols-3 gap-3">
                <label className="cursor-pointer">
                  <input type="radio" name="vertical" value="restaurant" defaultChecked className="peer sr-only" />
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all">
                    <span className="text-2xl">🍽️</span>
                    <span className="text-sm font-medium">Restaurant</span>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input type="radio" name="vertical" value="clinic" className="peer sr-only" />
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all">
                    <span className="text-2xl">🏥</span>
                    <span className="text-sm font-medium">Clinic</span>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input type="radio" name="vertical" value="retail" className="peer sr-only" />
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all">
                    <span className="text-2xl">🛍️</span>
                    <span className="text-sm font-medium">Retail</span>
                  </div>
                </label>
              </div>
              <p className="text-xs text-zinc-500">We'll set up a starter automation flow tailored to your business type.</p>
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
