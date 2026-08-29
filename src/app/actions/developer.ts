'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

export async function generateApiKey(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  if (!name) return { error: 'Key name is required' }

  // Get user's tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) return { error: 'No workspace found' }
  const tenantId = members[0].tenant_id

  // Generate a random key starting with or_
  const rawKey = `or_${crypto.randomBytes(24).toString('hex')}`

  // For MVP, we save the raw key in the key_hash column so it can be seen in the DB.
  // In a real production app, you would hash it here and only show the raw key once.
  const { error } = await supabase
    .from('tenant_api_keys')
    .insert([{ 
      tenant_id: tenantId, 
      name,
      key_hash: rawKey 
    }])

  if (error) return { error: 'Failed to generate key' }

  revalidatePath('/dashboard/developer')
  return { success: true }
}

export async function revokeApiKey(formData: FormData) {
  const supabase = await createClient()
  const keyId = formData.get('keyId') as string
  
  if (keyId) {
    await supabase.from('tenant_api_keys').delete().eq('id', keyId)
    revalidatePath('/dashboard/developer')
  }
}
