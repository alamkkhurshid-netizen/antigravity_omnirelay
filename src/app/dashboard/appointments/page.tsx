import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Clock, CalendarCheck, Stethoscope } from 'lucide-react'

export default async function AppointmentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  // Get appointments with contact and doctor details joined
  const { data: appointments } = await supabase
    .from('clinic_appointments')
    .select(`
      *,
      contacts (name, phone_number),
      doctors (name)
    `)
    .eq('tenant_id', tenantId)
    .order('appointment_date', { ascending: true })

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
        <h1 className="text-3xl font-bold tracking-tight">Clinic Appointments</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {appointments?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed rounded-lg">
            <CalendarCheck className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No appointments yet</h3>
            <p className="text-zinc-500 text-sm">When patients book via WhatsApp, they will appear here.</p>
          </div>
        ) : (
          appointments?.map((appt: any) => (
            <Card key={appt.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {appt.contacts?.name || appt.contacts?.phone_number}
                  </CardTitle>
                  <Badge variant="outline" className={getStatusColor(appt.status)}>
                    {appt.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>{appt.contacts?.phone_number}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pb-4">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(appt.appointment_date).toLocaleDateString()} at {appt.appointment_time}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                  <Stethoscope className="w-4 h-4" />
                  <span>{appt.doctors?.name || 'Unassigned'}</span>
                </div>
              </CardContent>
              {appt.status === 'pending' && (
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
