'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function upgradePlan(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const planName = formData.get('planName') as string
  if (!['free', 'growth', 'pro'].includes(planName)) return { error: 'Invalid plan' }

  // Get user's tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) return { error: 'No workspace found' }

  const tenantId = members[0].tenant_id

  // Simulate Razorpay Checkout success by updating DB directly
  const { error } = await supabase
    .from('tenant_subscriptions')
    .update({ 
      plan_name: planName,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)

  if (error) return { error: 'Failed to upgrade plan' }

  revalidatePath('/dashboard/billing')
  return { success: true }
}

export async function addWalletFunds(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amountStr = formData.get('amount') as string
  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) return { error: 'Invalid amount' }

  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) return { error: 'No workspace found' }

  const tenantId = members[0].tenant_id

  // Get current balance
  const { data: wallet } = await supabase
    .from('tenant_wallets')
    .select('balance_inr')
    .eq('tenant_id', tenantId)
    .single()

  const currentBalance = wallet ? parseFloat(wallet.balance_inr as unknown as string) : 0
  const newBalance = currentBalance + amount

  // Simulate successful Razorpay wallet recharge
  const { error } = await supabase
    .from('tenant_wallets')
    .update({ 
      balance_inr: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)

  if (error) return { error: 'Failed to add funds' }

  revalidatePath('/dashboard/billing')
  return { success: true }
}
