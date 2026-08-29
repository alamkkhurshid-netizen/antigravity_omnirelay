'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function createTenant(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const businessName = formData.get('businessName') as string
  if (!businessName || businessName.length < 2) {
    return { error: 'Business name is required' }
  }

  // Generate a simple slug from the business name
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000)

  // Use the admin client to bypass RLS for the initial tenant creation
  const adminAuth = createAdminClient()

  // 1. Create the tenant
  const { data: tenant, error: tenantError } = await adminAuth
    .from('tenants')
    .insert([{ name: businessName, slug }])
    .select('id')
    .single()

  if (tenantError || !tenant) {
    console.error('Failed to create tenant:', tenantError)
    return { error: 'Failed to create workspace. Please try again.' }
  }

  // 2. Add the user as the owner in tenant_members
  const { error: memberError } = await adminAuth
    .from('tenant_members')
    .insert([{ 
      tenant_id: tenant.id, 
      user_id: user.id, 
      role: 'owner' 
    }])

  if (memberError) {
    console.error('Failed to add user to tenant:', memberError)
    // In a production app, we should probably rollback the tenant creation here
    return { error: 'Failed to set up permissions.' }
  }

  // 3. Success! Revalidate and redirect
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
