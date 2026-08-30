import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createFlow } from '@/app/actions/flows'
import { FlowStatusToggle } from '@/components/flow/FlowStatusToggle'
import Link from 'next/link'

export default async function FlowsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
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
          <form action={createFlow as any}>
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
          <Card key={flow.id} className={flow.status === 'active' ? 'border-green-500/50 ring-1 ring-green-500/20' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{flow.name}</CardTitle>
                <Badge variant={flow.status === 'active' ? 'default' : 'secondary'} className={flow.status === 'active' ? 'bg-green-600' : ''}>
                  {flow.status}
                </Badge>
              </div>
              <CardDescription>
                Created: {new Date(flow.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">
                Last updated: {new Date(flow.updated_at).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Link href={`/dashboard/flows/${flow.id}`} className="flex-1">
                <Button variant="outline" className="w-full">Open Builder</Button>
              </Link>
              <FlowStatusToggle flowId={flow.id} currentStatus={flow.status} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
