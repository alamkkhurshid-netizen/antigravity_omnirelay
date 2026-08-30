import { createAdminClient } from '@/utils/supabase/admin'

export async function debitWalletForMessage(tenantId: string, messageId: string, category: 'utility' | 'marketing' | 'authentication' | 'service') {
  const supabase = createAdminClient()
  
  // Example Meta pricing (INR)
  const PRICING = {
    utility: 0.14,
    marketing: 0.92,
    authentication: 0.14,
    service: 0.35
  }
  
  const metaCost = PRICING[category] || 0.35
  const markup = 1.2 // 20% markup
  const billedCost = metaCost * markup
  
  try {
    // 1. Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('tenant_wallets')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()
      
    if (walletError || !wallet) {
      console.error('Wallet not found for tenant:', tenantId)
      return { success: false, error: 'Wallet not found' }
    }
    
    let status = 'failed'
    
    // 2. Try to use free quota first (for utility/service)
    if (wallet.free_quota_remaining > 0 && (category === 'utility' || category === 'service')) {
      await supabase
        .from('tenant_wallets')
        .update({ free_quota_remaining: wallet.free_quota_remaining - 1 })
        .eq('id', wallet.id)
      status = 'quota_used'
    } 
    // 3. Otherwise debit balance
    else if (wallet.balance_inr >= billedCost) {
      await supabase
        .from('tenant_wallets')
        .update({ balance_inr: wallet.balance_inr - billedCost })
        .eq('id', wallet.id)
      status = 'deducted'
    } 
    else {
      console.warn(`Insufficient funds for tenant ${tenantId}. Required: ${billedCost}, Available: ${wallet.balance_inr}`)
      status = 'failed'
      // In production, we would block the send entirely. For MVP, we'll log it as failed but let it through or stop the send based on strictness.
    }
    
    // 4. Log to ledger
    await supabase
      .from('message_ledger')
      .insert({
        tenant_id: tenantId,
        message_id: messageId,
        channel: 'whatsapp',
        category: category,
        meta_cost_inr: metaCost,
        billed_cost_inr: billedCost,
        status: status
      })
      
    return { success: status !== 'failed', status }
  } catch (error) {
    console.error('Billing debit error:', error)
    return { success: false, error: 'Internal billing error' }
  }
}
