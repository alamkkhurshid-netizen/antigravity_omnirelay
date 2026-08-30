'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function createFlow(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  if (!name) return { error: 'Flow name is required' }

  // Get user's tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) {
    return { error: 'User does not belong to a workspace' }
  }

  const tenant_id = members[0].tenant_id

  // Create the flow
  const { data: flow, error } = await supabase
    .from('flows')
    .insert([{ tenant_id, name, status: 'draft' }])
    .select('id')
    .single()

  if (error || !flow) {
    return { error: 'Failed to create flow' }
  }

  // Create initial flow version
  await supabase
    .from('flow_versions')
    .insert([{ flow_id: flow.id, nodes: [], edges: [] }])

  revalidatePath('/dashboard/flows')
  redirect(`/dashboard/flows/${flow.id}`)
}

export async function saveFlowVersion(flowId: string, nodes: any[], edges: any[]) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check if flow exists and user has access
  const { data: flow } = await supabase
    .from('flows')
    .select('id')
    .eq('id', flowId)
    .single()

  if (!flow) {
    return { error: 'Flow not found or access denied' }
  }

  // Upsert or insert a new flow version (for MVP, we'll just insert a new version to keep history)
  const { error } = await supabase
    .from('flow_versions')
    .insert([{ 
      flow_id: flowId, 
      nodes, 
      edges 
    }])

  if (error) {
    return { error: 'Failed to save flow state' }
  }

  revalidatePath(`/dashboard/flows/${flowId}`)
  return { success: true }
}

export async function toggleFlowStatus(flowId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get current flow
  const { data: flow } = await supabase
    .from('flows')
    .select('id, status, tenant_id')
    .eq('id', flowId)
    .single()

  if (!flow) return { error: 'Flow not found' }

  const newStatus = flow.status === 'active' ? 'draft' : 'active'

  // If activating, deactivate all other flows for this tenant first
  if (newStatus === 'active') {
    await supabase
      .from('flows')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('tenant_id', flow.tenant_id)
      .eq('status', 'active')
  }

  const { error } = await supabase
    .from('flows')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', flowId)

  if (error) return { error: 'Failed to update flow status' }

  revalidatePath('/dashboard/flows')
  return { success: true, newStatus }
}
