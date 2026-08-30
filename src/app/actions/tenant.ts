'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Pre-built flow templates per vertical
const FLOW_TEMPLATES: Record<string, { name: string, nodes: any[], edges: any[] }> = {
  restaurant: {
    name: 'Restaurant Booking Flow',
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'When customer messages' } },
      { id: 'msg-welcome', type: 'message', position: { x: 250, y: 200 }, data: { label: '👋 Welcome to {business}! How can I help you today?\n\n1️⃣ Book a table\n2️⃣ View menu\n3️⃣ Talk to someone' } },
      { id: 'cond-book', type: 'condition', position: { x: 250, y: 370 }, data: { label: 'book' } },
      { id: 'msg-party', type: 'message', position: { x: 80, y: 530 }, data: { label: 'Great! How many people will be dining? Please reply with a number.' } },
      { id: 'msg-fallback', type: 'message', position: { x: 450, y: 530 }, data: { label: 'Thanks for your message! Our team will get back to you shortly. For reservations, just say "book".' } },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'msg-welcome' },
      { id: 'e2', source: 'msg-welcome', target: 'cond-book' },
      { id: 'e3', source: 'cond-book', target: 'msg-party', sourceHandle: 'true' },
      { id: 'e4', source: 'cond-book', target: 'msg-fallback', sourceHandle: 'false' },
    ]
  },
  clinic: {
    name: 'Clinic Appointment Flow',
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'When patient messages' } },
      { id: 'msg-welcome', type: 'message', position: { x: 250, y: 200 }, data: { label: '🏥 Welcome to {business}!\n\n1️⃣ Book an appointment\n2️⃣ Check appointment status\n3️⃣ Speak to reception' } },
      { id: 'cond-appt', type: 'condition', position: { x: 250, y: 370 }, data: { label: 'appointment' } },
      { id: 'msg-doctor', type: 'message', position: { x: 80, y: 530 }, data: { label: 'Which doctor would you like to see? Please reply with the doctor\'s name or specialty.' } },
      { id: 'msg-fallback', type: 'message', position: { x: 450, y: 530 }, data: { label: 'Thank you for reaching out! Our reception team will assist you shortly. For appointments, say "appointment".' } },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'msg-welcome' },
      { id: 'e2', source: 'msg-welcome', target: 'cond-appt' },
      { id: 'e3', source: 'cond-appt', target: 'msg-doctor', sourceHandle: 'true' },
      { id: 'e4', source: 'cond-appt', target: 'msg-fallback', sourceHandle: 'false' },
    ]
  },
  retail: {
    name: 'Retail Order Flow',
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'When customer messages' } },
      { id: 'msg-welcome', type: 'message', position: { x: 250, y: 200 }, data: { label: '🛍️ Welcome to {business}!\n\n1️⃣ Browse products\n2️⃣ Track my order\n3️⃣ Talk to support' } },
      { id: 'cond-order', type: 'condition', position: { x: 250, y: 370 }, data: { label: 'order' } },
      { id: 'msg-catalog', type: 'message', position: { x: 80, y: 530 }, data: { label: 'Please share your order number and we\'ll check the status for you!' } },
      { id: 'msg-fallback', type: 'message', position: { x: 450, y: 530 }, data: { label: 'Thanks for your message! Our support team will be with you shortly.' } },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'msg-welcome' },
      { id: 'e2', source: 'msg-welcome', target: 'cond-order' },
      { id: 'e3', source: 'cond-order', target: 'msg-catalog', sourceHandle: 'true' },
      { id: 'e4', source: 'cond-order', target: 'msg-fallback', sourceHandle: 'false' },
    ]
  }
}

export async function createTenant(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const businessName = formData.get('businessName') as string
  const vertical = formData.get('vertical') as string || 'restaurant'
  
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
    return { error: 'Failed to set up permissions.' }
  }

  // 3. Seed a default flow for the selected vertical
  const template = FLOW_TEMPLATES[vertical] || FLOW_TEMPLATES.restaurant
  const flowName = template.name.replace('{business}', businessName)

  const { data: flow } = await adminAuth
    .from('flows')
    .insert([{ tenant_id: tenant.id, name: flowName, status: 'draft' }])
    .select('id')
    .single()

  if (flow) {
    // Replace {business} placeholders in node labels
    const processedNodes = template.nodes.map(n => ({
      ...n,
      data: { ...n.data, label: (n.data.label as string).replace(/{business}/g, businessName) }
    }))

    await adminAuth
      .from('flow_versions')
      .insert([{ flow_id: flow.id, nodes: processedNodes, edges: template.edges }])
  }

  // 4. Success! Revalidate and redirect
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
