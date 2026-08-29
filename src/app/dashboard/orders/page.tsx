import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Package, Truck, CreditCard, ShoppingBag } from 'lucide-react'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get orders with contact details joined
  const { data: orders } = await supabase
    .from('retail_orders')
    .select(`
      *,
      contacts (name, phone_number)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const getShippingColor = (status: string) => {
    switch(status) {
      case 'processing': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      case 'shipped': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'delivered': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      default: return ''
    }
  }

  const getPaymentColor = (status: string) => {
    switch(status) {
      case 'pending': return 'text-yellow-600'
      case 'paid': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'refunded': return 'text-zinc-600'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Retail Orders</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {orders?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed rounded-lg">
            <ShoppingBag className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No orders yet</h3>
            <p className="text-zinc-500 text-sm">When customers place orders via WhatsApp Catalog, they will appear here.</p>
          </div>
        ) : (
          orders?.map((order: any) => (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <CardDescription>{order.contacts?.name || order.contacts?.phone_number}</CardDescription>
                  </div>
                  <Badge variant="outline" className={getShippingColor(order.shipping_status)}>
                    {order.shipping_status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <CreditCard className="w-4 h-4" />
                    <span>Amount:</span>
                  </div>
                  <span className="font-semibold">₹{order.total_amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <Package className="w-4 h-4" />
                    <span>Payment:</span>
                  </div>
                  <span className={`font-medium capitalize ${getPaymentColor(order.payment_status)}`}>
                    {order.payment_status}
                  </span>
                </div>
              </CardContent>
              {order.shipping_status === 'processing' && (
                <CardFooter className="pt-0">
                  <Button variant="outline" className="w-full gap-2">
                    <Truck className="w-4 h-4" />
                    Mark as Shipped
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
