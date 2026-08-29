import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createFlow } from '@/app/actions/flows'
import Link from 'next/link'

export default async function FlowsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  // RLS will automatically filter this down to just the tenant's flows
  const { data: flows } = await supabase
    .from('flows')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Automation Flows</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Create New Flow Card */}
        <Card className="border-dashed border-2 flex flex-col justify-center bg-zinc-50/50 dark:bg-zinc-950/50">
          <form action={createFlow}>
            <CardHeader>
              <CardTitle>Create New Flow</CardTitle>
              <CardDescription>Design a new automated WhatsApp workflow.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input name="name" placeholder="e.g. Appointment Booking" required />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">Create Flow</Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* List existing flows */}
        {flows?.map((flow) => (
          <Card key={flow.id}>
            <CardHeader>
              <CardTitle>{flow.name}</CardTitle>
              <CardDescription className="capitalize">
                Status: {flow.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">
                Created: {new Date(flow.created_at).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/flows/${flow.id}`}>Open Builder</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
