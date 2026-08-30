import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendWhatsAppMessage } from '@/utils/meta'
import { debitWalletForMessage, checkWalletBalance } from '@/utils/billing'

export async function GET(request: Request) {
  // Simple auth for Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  
  try {
    // 1. Find appointments happening in the next 24 hours that haven't had a reminder sent
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Format dates to YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: appointments, error } = await supabase
      .from('clinic_appointments')
      .select('*, contacts(*)')
      .eq('reminder_sent', false)
      .eq('status', 'approved')
      .gte('appointment_date', todayStr)
      .lte('appointment_date', tomorrowStr)
      
    if (error) throw error
    
    let sentCount = 0

    for (const appt of appointments) {
      if (!appt.contacts?.phone_number) continue

      const tenantId = appt.tenant_id
      
      // Check balance
      const hasBalance = await checkWalletBalance(tenantId, 'utility')
      if (!hasBalance) {
        console.warn(`Skipping reminder for tenant ${tenantId} due to insufficient balance.`)
        continue
      }
      
      // Get WA config
      const { data: waConfig } = await supabase
        .from('tenant_whatsapp_configs')
        .select('phone_number_id, system_user_token')
        .eq('tenant_id', tenantId)
        .single()
        
      if (!waConfig?.phone_number_id || !waConfig?.system_user_token) continue

      // Send reminder
      const messageText = `Hi ${appt.contacts.name || ''}, this is a reminder for your upcoming appointment on ${appt.appointment_date} at ${appt.appointment_time}. Please reply with 'cancel' if you cannot make it.`
      
      try {
        await sendWhatsAppMessage(
          waConfig.phone_number_id,
          appt.contacts.phone_number,
          messageText,
          waConfig.system_user_token
        )
        
        // Log message
        const { data: msgRec } = await supabase
          .from('messages')
          .insert({
            contact_id: appt.contact_id,
            direction: 'outbound',
            content: messageText,
            status: 'sent',
            channel: 'whatsapp'
          })
          .select('id')
          .single()
          
        if (msgRec) {
          await debitWalletForMessage(tenantId, msgRec.id, 'utility')
        }
        
        // Mark as sent
        await supabase
          .from('clinic_appointments')
          .update({ reminder_sent: true })
          .eq('id', appt.id)
          
        sentCount++
      } catch (err) {
        console.error(`Failed to send reminder for appointment ${appt.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, sent: sentCount })
  } catch (err) {
    console.error('Cron error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
