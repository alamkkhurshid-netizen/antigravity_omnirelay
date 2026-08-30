import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FlowBuilder from '@/components/flow/FlowBuilder'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  // Verify access and get flow data
  const { data: flow, error } = await supabase
    .from('flows')
    .select('*, flow_versions(nodes, edges)')
    .eq('id', id)
    .single()

  if (error || !flow) {
    redirect('/dashboard/flows')
  }

  const latestVersion = flow.flow_versions?.[0] || { nodes: [], edges: [] }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Link href="/dashboard/flows">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{flow.name}</h1>
          <p className="text-sm text-zinc-500 capitalize">Status: {flow.status}</p>
        </div>
      </div>
      
      <FlowBuilder initialFlowState={latestVersion} flowId={flow.id} />
    </div>
  )
}
