import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const text = await request.text()
    const signature = request.headers.get('x-razorpay-signature')
    
    if (!signature) {
      return new NextResponse('Missing signature', { status: 400 })
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is missing')
      return new NextResponse('Server configuration error', { status: 500 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex')

    if (expectedSignature !== signature) {
      return new NextResponse('Invalid signature', { status: 400 })
    }

    const body = JSON.parse(text)
    
    // We only care about successful payments
    if (body.event !== 'payment.captured' && body.event !== 'order.paid') {
      return new NextResponse('Ignored event', { status: 200 })
    }

    const payment = body.payload.payment.entity
    const amountINR = payment.amount / 100 // Convert paise back to INR
    const tenantId = payment.notes?.tenantId

    if (!tenantId) {
      console.error('Payment missing tenantId in notes:', payment.id)
      return new NextResponse('Missing tenantId', { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('tenant_wallets')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (walletError || !wallet) {
      console.error(`Wallet not found for tenant ${tenantId}`)
      return new NextResponse('Wallet not found', { status: 404 })
    }

    // 2. Add funds
    const newBalance = Number(wallet.balance_inr) + amountINR

    const { error: updateError } = await supabase
      .from('tenant_wallets')
      .update({ balance_inr: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id)

    if (updateError) {
      console.error('Failed to update wallet:', updateError)
      return new NextResponse('Database error', { status: 500 })
    }

    console.log(`Successfully added ₹${amountINR} to tenant ${tenantId} wallet.`)
    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('Razorpay Webhook Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
