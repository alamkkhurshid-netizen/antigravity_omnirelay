import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, Zap, CreditCard, ShieldCheck } from 'lucide-react'
import { upgradePlan } from '@/app/actions/billing'
import { RazorpayCheckout } from '@/components/billing/RazorpayCheckout'

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Fetch subscription
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  const activePlan = sub?.plan_name || 'free'

  // Fetch wallet
  const { data: wallet } = await supabase
    .from('tenant_wallets')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  const balance = wallet ? parseFloat(wallet.balance_inr).toFixed(2) : '0.00'
  const freeQuota = wallet?.free_quota_remaining || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-zinc-500">Manage your subscription and messaging wallet.</p>
      </div>

      {/* Wallet Section */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Wallet className="w-5 h-5" />
            <CardTitle className="text-lg">Messaging Wallet</CardTitle>
          </div>
          <CardDescription>
            Prepaid balance used to send automated WhatsApp messages outside your free tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-6 mb-6">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Available Balance</p>
              <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">₹{balance}</div>
            </div>
            <div className="pb-1">
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {freeQuota} free messages remaining
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <RazorpayCheckout 
              amountINR={500} 
              buttonText="Add ₹500" 
              variant="outline" 
              icon="credit-card"
            />
            <RazorpayCheckout 
              amountINR={1000} 
              buttonText="Recharge ₹1,000" 
              variant="default" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              icon="zap"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Subscription Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Free Tier */}
          <Card className={activePlan === 'free' ? 'border-zinc-400 ring-1 ring-zinc-400' : ''}>
            <CardHeader>
              <CardTitle>Free MVP</CardTitle>
              <CardDescription>Perfect for testing</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">₹0</span><span className="text-zinc-500">/mo</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• 500 free utility messages</li>
                <li>• 1 Doctor / 1 Location</li>
                <li>• Basic visual flow builder</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button disabled variant={activePlan === 'free' ? 'default' : 'outline'} className="w-full">
                {activePlan === 'free' ? 'Current Plan' : 'Downgrade'}
              </Button>
            </CardFooter>
          </Card>

          {/* Growth Tier */}
          <Card className={activePlan === 'growth' ? 'border-blue-500 ring-2 ring-blue-500' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Growth</CardTitle>
                  <CardDescription>For busy locations</CardDescription>
                </div>
                {activePlan === 'growth' && <ShieldCheck className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold">₹2,400</span><span className="text-zinc-500">/mo</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Unified Inbox access</li>
                <li>• Up to 5 Doctors / Staff</li>
                <li>• Broadcast composer</li>
              </ul>
            </CardContent>
            <CardFooter>
              {activePlan === 'growth' ? (
                <Button disabled className="w-full bg-blue-600 text-white">Current Plan</Button>
              ) : (
                <form action={upgradePlan} className="w-full">
                  <input type="hidden" name="planName" value="growth" />
                  <Button type="submit" className="w-full">Upgrade to Growth</Button>
                </form>
              )}
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className={activePlan === 'pro' ? 'border-blue-500 ring-2 ring-blue-500' : ''}>
            <CardHeader>
              <CardTitle>Pro CRM</CardTitle>
              <CardDescription>Multi-location chains</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">₹6,500</span><span className="text-zinc-500">/mo</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Advanced CRM Pipelines</li>
                <li>• Unlimited Doctors</li>
                <li>• AI-drafted responses</li>
              </ul>
            </CardContent>
            <CardFooter>
              {activePlan === 'pro' ? (
                <Button disabled className="w-full bg-blue-600 text-white">Current Plan</Button>
              ) : (
                <form action={upgradePlan} className="w-full">
                  <input type="hidden" name="planName" value="pro" />
                  <Button type="submit" className="w-full" variant={activePlan === 'growth' ? "default" : "secondary"}>Upgrade to Pro</Button>
                </form>
              )}
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  )
}

function Badge({ children, className, ...props }: any) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  )
}
