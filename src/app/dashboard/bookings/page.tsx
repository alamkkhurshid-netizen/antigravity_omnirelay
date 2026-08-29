import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, CalendarCheck } from 'lucide-react'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get bookings with contact details joined
  const { data: bookings } = await supabase
    .from('restaurant_bookings')
    .select(`
      *,
      contacts (name, phone_number)
    `)
    .eq('tenant_id', tenantId)
    .order('booking_date', { ascending: true })

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      case 'approved': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'rejected': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'completed': return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Restaurant Reservations</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bookings?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed rounded-lg">
            <CalendarCheck className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No reservations yet</h3>
            <p className="text-zinc-500 text-sm">When customers book via WhatsApp, they will appear here.</p>
          </div>
        ) : (
          bookings?.map((booking: any) => (
            <Card key={booking.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {booking.contacts?.name || booking.contacts?.phone_number}
                  </CardTitle>
                  <Badge variant="outline" className={getStatusColor(booking.status)}>
                    {booking.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>{booking.contacts?.phone_number}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pb-4">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <Users className="w-4 h-4" />
                  <span>Party of {booking.party_size}</span>
                </div>
              </CardContent>
              {booking.status === 'pending' && (
                <CardFooter className="gap-2 pt-0">
                  <Button variant="default" className="flex-1 bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                  <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">Reject</Button>
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
