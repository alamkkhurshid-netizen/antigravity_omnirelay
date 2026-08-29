import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createDoctor } from '@/app/actions/doctors'
import { Stethoscope } from 'lucide-react'

export default async function DoctorsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: members } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .limit(1)

  const tenantId = members?.[0]?.tenant_id

  const { data: doctors } = await supabase
    .from('doctors')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Doctors</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Add New Doctor Card */}
        <Card className="border-dashed border-2 flex flex-col justify-center bg-zinc-50/50 dark:bg-zinc-950/50">
          <form action={createDoctor}>
            <CardHeader>
              <CardTitle>Add Doctor</CardTitle>
              <CardDescription>Add a new practitioner to your clinic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input name="name" placeholder="e.g. Dr. Jane Smith" required />
              <Input name="specialty" placeholder="e.g. Cardiologist" />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">Add to Directory</Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* List existing doctors */}
        {doctors?.map((doctor) => (
          <Card key={doctor.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{doctor.name}</CardTitle>
                  <CardDescription>{doctor.specialty || 'General Practice'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">
                Added: {new Date(doctor.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
