'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// This describes the shape of our user data
type Profile = {
  id: string
  email: string
  emergency_contact_email: string | null
  last_checkin: string
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [timeLeft, setTimeLeft] = useState(0) // seconds remaining
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const router = useRouter()

  // Load user profile from database
  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    // If not logged in, redirect to login page
    if (!user) {
      router.push('/')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error loading profile:', error)
      setLoading(false)
      return
    }

    if (data) {
      setProfile(data)
      setContactEmail(data.emergency_contact_email || '')
    }
    setLoading(false)
  }, [router])

  // Run loadProfile when page first loads
  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Countdown timer — updates every second
  useEffect(() => {
    if (!profile) return

    const updateTimer = () => {
      const lastCI = new Date(profile.last_checkin).getTime()
      const deadline = lastCI + 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    updateTimer() // Run immediately
    const interval = setInterval(updateTimer, 1000) // Then every second
    return () => clearInterval(interval) // Cleanup
  }, [profile])

  // Format seconds into HH:MM:SS
  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
  }

  // Handle check-in button click
  async function handleCheckIn() {
    if (!profile || checkingIn) return
    setCheckingIn(true)

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('profiles')
      .update({ last_checkin: now })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, last_checkin: now })
      setTimeLeft(24 * 60 * 60) // Reset to 24 hours
    }
    setCheckingIn(false)
  }

  // Save emergency contact email
  async function saveContact() {
    if (!profile || !contactEmail) return
    setSavingContact(true)
    setContactSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({ emergency_contact_email: contactEmail })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, emergency_contact_email: contactEmail })
      setContactSaved(true)
      setTimeout(() => setContactSaved(false), 3000) // Hide message after 3s
    }
    setSavingContact(false)
  }

  // Sign out
  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 120, color: '#6b7280' }}>
        Loading...
      </div>
    )
  }

  // Determine timer state for colours
  const isOverdue = timeLeft === 0
  const isWarning = !isOverdue && timeLeft < 4 * 60 * 60 // less than 4 hours
  const statusColor = isOverdue ? '#dc2626' : isWarning ? '#d97706' : '#16a34a'
  const statusBg = isOverdue ? '#fef2f2' : isWarning ? '#fffbeb' : '#f0fdf4'
  const statusBorder = isOverdue ? '#fca5a5' : isWarning ? '#fcd34d' : '#86efac'

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px' }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🛡️ Lil Lifeline</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
            {profile?.email}
          </p>
        </div>
        <button
          onClick={signOut}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            padding: '7px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            color: '#6b7280',
            fontFamily: 'inherit'
          }}
        >
          Sign out
        </button>
      </div>

      {/* Timer Card — main feature */}
      <div style={{
        background: statusBg,
        border: `2px solid ${statusBorder}`,
        borderRadius: 20,
        padding: '40px 28px',
        textAlign: 'center',
        marginBottom: 20
      }}>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Next check-in due in
        </p>

        {/* The big countdown clock */}
        <div style={{
          fontSize: isOverdue ? 36 : 58,
          fontWeight: 800,
          fontFamily: 'monospace',
          color: statusColor,
          letterSpacing: '-1px',
          marginBottom: 6,
          lineHeight: 1
        }}>
          {isOverdue ? 'OVERDUE' : formatTime(timeLeft)}
        </div>

        {/* Status message */}
        <p style={{ fontSize: 14, color: statusColor, marginBottom: 28, minHeight: 20 }}>
          {isOverdue
            ? '⚠️ Your contact has been notified'
            : isWarning
            ? '⏰ Time is running low — check in soon'
            : '✓ You\'re within your check-in window'}
        </p>

        {/* THE CHECK-IN BUTTON */}
        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          style={{
            padding: '18px 48px',
            fontSize: 17,
            fontWeight: 700,
            background: checkingIn ? '#86efac' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            cursor: checkingIn ? 'not-allowed' : 'pointer',
            boxShadow: checkingIn ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.35)',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
          }}
        >
          {checkingIn ? '...' : "✅  I'm Okay — Check In"}
        </button>

        {/* Last check-in time */}
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
          Last check-in: {profile ? new Date(profile.last_checkin).toLocaleString() : '—'}
        </p>
      </div>

      {/* Emergency Contact Card */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 24
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          📬 Emergency Contact
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
          If you miss your 24-hour check-in, this person will automatically receive an email alert.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="their@email.com"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveContact()}
          />
          <button
            onClick={saveContact}
            disabled={savingContact || !contactEmail}
            style={{
              padding: '10px 18px',
              background: savingContact ? '#93c5fd' : '#1d4ed8',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: savingContact || !contactEmail ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              flexShrink: 0
            }}
          >
            {savingContact ? '...' : 'Save'}
          </button>
        </div>

        {contactSaved && (
          <p style={{ fontSize: 13, color: '#16a34a', marginTop: 8 }}>
            ✅ Saved! They will be notified if you miss a check-in.
          </p>
        )}

        {profile?.emergency_contact_email && !contactSaved && (
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
            Currently saved: <strong>{profile.emergency_contact_email}</strong>
          </p>
        )}

        {!profile?.emergency_contact_email && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>
            ⚠️ No emergency contact set. Add one above.
          </p>
        )}
      </div>

      {/* How it works — small explainer */}
      <div style={{
        marginTop: 16,
        padding: '14px 18px',
        background: '#f9fafb',
        borderRadius: 10,
        fontSize: 12,
        color: '#9ca3af',
        lineHeight: 1.6
      }}>
        <strong style={{ color: '#6b7280' }}>How it works:</strong> Click "I'm Okay" once a day.
        If 24 hours pass without a check-in, your emergency contact receives an email.
        The timer resets every time you check in.
      </div>
    </main>
  )
}