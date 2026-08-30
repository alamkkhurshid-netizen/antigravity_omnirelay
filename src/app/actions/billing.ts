'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import Razorpay from 'razorpay'

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

export async function createRazorpayOrder(amountINR: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (amountINR <= 0) return { error: 'Invalid amount' }

  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) return { error: 'No workspace found' }
  const tenantId = members[0].tenant_id

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return { error: 'Razorpay keys not configured' }
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })

    const options = {
      amount: amountINR * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `receipt_${tenantId}_${Date.now()}`,
      notes: {
        tenantId: tenantId
      }
    }

    const order = await razorpay.orders.create(options)
    
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID
    }
  } catch (error) {
    console.error('Razorpay Error:', error)
    return { error: 'Failed to create payment order' }
  }
}
