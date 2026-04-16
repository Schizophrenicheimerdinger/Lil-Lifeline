import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Admin Supabase client — can bypass security rules to read all users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(request: Request) {
  // Security check: make sure this is being called by our scheduled job
  // and not by a random person on the internet
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized attempt to call check-missed endpoint')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Calculate the cutoff time: 24 hours ago
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Find all users whose last check-in was MORE than 24 hours ago
  // and who have an emergency contact set
  const { data: overdueUsers, error: dbError } = await supabaseAdmin
    .from('profiles')
    .select('email, emergency_contact_email, last_checkin')
    .lt('last_checkin', cutoff)                        // last_checkin < 24 hours ago
    .not('emergency_contact_email', 'is', null)        // must have contact set
    .neq('emergency_contact_email', '')                // contact must not be empty

  if (dbError) {
    console.error('Database error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const results: { user: string; status: string }[] = []

  // Send an email for each overdue user
  for (const user of overdueUsers || []) {
    try {
      const lastCheckInDate = new Date(user.last_checkin).toLocaleString('en-AU', {
        dateStyle: 'full',
        timeStyle: 'short'
      })

      const hoursOverdue = Math.floor(
        (Date.now() - new Date(user.last_checkin).getTime()) / (1000 * 60 * 60)
      )

      await resend.emails.send({
        from: 'Lil Lifeline <alerts@resend.dev>', // Change this once you have a domain
        to: user.emergency_contact_email,
        subject: `⚠️ Check-in alert: ${user.email} hasn't checked in`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
            <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 8px;">⚠️ Check-in Alert</h1>
            <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
              This is an automated alert from <strong>Lil Lifeline</strong>.
            </p>

            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="font-size: 16px; color: #7f1d1d; margin: 0;">
                <strong>${user.email}</strong> has not checked in for the past
                <strong>${hoursOverdue} hours</strong>.
              </p>
              <p style="font-size: 14px; color: #991b1b; margin: 8px 0 0;">
                Their last check-in was: ${lastCheckInDate}
              </p>
            </div>

            <p style="font-size: 16px; color: #374151; margin-bottom: 8px;">
              Please reach out to check that they are okay.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">
              You are receiving this because you are listed as an emergency contact on Lil Lifeline.
              This is an automated message — please do not reply to this email.
            </p>
          </div>
        `
      })

      results.push({ user: user.email, status: 'email_sent' })
      console.log(`Alert sent for ${user.email}`)
    } catch (emailError) {
      console.error(`Failed to send email for ${user.email}:`, emailError)
      results.push({ user: user.email, status: 'email_failed' })
    }
  }

  return NextResponse.json({
    success: true,
    checked_at: new Date().toISOString(),
    overdue_count: overdueUsers?.length || 0,
    results
  })
}