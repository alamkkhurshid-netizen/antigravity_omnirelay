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
    const { data: keyRecord } = await supabase
      .from('tenant_api_keys')
      .select('tenant_id, id')
      .eq('key_hash', token)
      .single()

    if (!keyRecord) {
      return new NextResponse('Unauthorized: Invalid API Key', { status: 401 })
    }

    const tenantId = keyRecord.tenant_id
    supabase.from('tenant_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id).then()

    // To get messages, we must ensure they belong to contacts that belong to this tenant.
    // In Supabase, we can use an inner join or a subquery. 
    // For MVP, we will query messages where contact.tenant_id matches.
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        direction,
        content,
        status,
        channel,
        created_at,
        contacts!inner(id, tenant_id)
      `)
      .eq('contacts.tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Map to remove the nested contacts object for cleaner API response
    const cleanData = messages.map(msg => ({
      id: msg.id,
      contact_id: msg.contacts.id,
      direction: msg.direction,
      content: msg.content,
      status: msg.status,
      channel: msg.channel,
      created_at: msg.created_at
    }))

    return NextResponse.json({
      object: 'list',
      count: cleanData.length,
      data: cleanData
    })

  } catch (error) {
    console.error('API /v1/messages Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
