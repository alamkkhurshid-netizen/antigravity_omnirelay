import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized: Missing or invalid Bearer token', { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const supabase = createAdminClient()

    // Authenticate token against tenant_api_keys
    // Note: For MVP we are matching raw strings. In Prod, query by a public ID and verify the hash.
    const { data: keyRecord } = await supabase
      .from('tenant_api_keys')
      .select('tenant_id, id')
      .eq('key_hash', token)
      .single()

    if (!keyRecord) {
      return new NextResponse('Unauthorized: Invalid API Key', { status: 401 })
    }

    const tenantId = keyRecord.tenant_id

    // Log key usage (fire and forget)
    supabase.from('tenant_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id).then()

    // Fetch contacts for this tenant
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, name, phone_number, instagram_id, created_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(100) // Basic pagination limit for MVP

    if (error) throw error

    return NextResponse.json({
      object: 'list',
      count: contacts.length,
      data: contacts
    })

  } catch (error) {
    console.error('API /v1/contacts Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
