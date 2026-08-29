'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createDoctor(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const specialty = formData.get('specialty') as string

  if (!name) return { error: 'Doctor name is required' }

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

  // Create the doctor
  const { error } = await supabase
    .from('doctors')
    .insert([{ tenant_id, name, specialty }])

  if (error) {
    return { error: 'Failed to add doctor' }
  }

  revalidatePath('/dashboard/doctors')
  return { success: true }
}
