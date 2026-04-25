import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

function isOverdue(profile: {
  last_checkin: string
  timer_mode: string
  timer_duration_hours: number
  timer_fixed_time: string | null
  grace_period_minutes: number
}): boolean {
  const now = Date.now()
  const lastCI = new Date(profile.last_checkin).getTime()
  const graceMs = profile.grace_period_minutes * 60 * 1000

  if (profile.timer_mode === 'fixed' && profile.timer_fixed_time) {
    const [hours, minutes] = profile.timer_fixed_time.split(':').map(Number)
    const todayDeadline = new Date()
    todayDeadline.setHours(hours, minutes, 0, 0)
    const yesterdayDeadline = new Date(todayDeadline)
    yesterdayDeadline.setDate(yesterdayDeadline.getDate() - 1)

    const relevantDeadline = lastCI > yesterdayDeadline.getTime() ? todayDeadline : yesterdayDeadline
    const msFromDeadline = now - relevantDeadline.getTime()
    return msFromDeadline > graceMs
  } else {
    const durationMs = profile.timer_duration_hours * 60 * 60 * 1000
    return (now - lastCI) > (durationMs + graceMs)
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: allUsers, error: dbError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, emergency_contact_email, last_checkin, tier, timer_mode, timer_duration_hours, timer_fixed_time, grace_period_minutes')
    .not('emergency_contact_email', 'is', null)
    .neq('emergency_contact_email', '')

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const overdueUsers = (allUsers || []).filter(u => isOverdue(u))
  const results: { user: string; status: string }[] = []

  for (const user of overdueUsers) {
    const hoursOverdue = Math.floor((Date.now() - new Date(user.last_checkin).getTime()) / (1000 * 60 * 60))
    const lastCheckInDate = new Date(user.last_checkin).toLocaleString()

    const contactsToNotify: string[] = [user.emergency_contact_email]

    if (user.tier === 'paid') {
      const { data: extraContacts } = await supabaseAdmin
        .from('emergency_contacts').select('email').eq('user_id', user.id)
      if (extraContacts) extraContacts.forEach(c => { if (!contactsToNotify.includes(c.email)) contactsToNotify.push(c.email) })
    }

    for (const contactEmail of contactsToNotify) {
      if (user.tier === 'paid') {
        try {
          // Also send in-app notification for paid users
      await supabaseAdmin.from('notifications').insert({
        recipient_email: contactEmail,
        sender_email: user.email,
        message: user.email + " hasn't checked in for " + hoursOverdue + " hours. Please reach out to make sure they're okay.",
        read: false
      }).catch(() => {})

      await resend.emails.send({
            from: 'Lil Lifeline <alerts@resend.dev>',
            to: contactEmail,
            subject: `⚠️ Check-in alert: ${user.email} hasn't checked in`,
            html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;background:#0a0a0a;color:white"><h1 style="color:#f87171;font-size:24px;margin-bottom:8px">⚠️ Check-in Alert</h1><p style="font-size:16px;color:#aaa;margin-bottom:24px">Automated alert from <strong style="color:white">Lil Lifeline</strong>.</p><div style="background:#1a1a1a;border:1px solid #f8717133;border-radius:12px;padding:20px;margin-bottom:24px"><p style="font-size:16px;color:#fca5a5;margin:0"><strong>${user.email}</strong> has not checked in for <strong>${hoursOverdue} hours</strong>.</p><p style="font-size:14px;color:#888;margin:8px 0 0">Last check-in: ${lastCheckInDate}</p></div><p style="font-size:16px;color:#aaa">Please reach out to check that they are okay.</p><hr style="border:none;border-top:1px solid #222;margin:24px 0"><p style="font-size:12px;color:#444">You are receiving this because you are listed as an emergency contact on Lil Lifeline.</p></div>`
          })
          results.push({ user: user.email, status: `email_sent_to_${contactEmail}` })
        } catch {
          results.push({ user: user.email, status: `email_failed_for_${contactEmail}` })
        }
      } else {
        try {
          await supabaseAdmin.from('notifications').insert({
            recipient_email: contactEmail,
            sender_email: user.email,
            message: `${user.email} hasn't checked in for ${hoursOverdue} hours. Please reach out to make sure they're okay.`,
            read: false
          })
          results.push({ user: user.email, status: 'in_app_notification_sent' })
        } catch {
          results.push({ user: user.email, status: 'notification_failed' })
        }
      }
    }
  }

  return NextResponse.json({ success: true, checked_at: new Date().toISOString(), overdue_count: overdueUsers.length, results })
}
