'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  email: string
  emergency_contact_email: string | null
  last_checkin: string
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const router = useRouter()

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) { setLoading(false); return }
    if (data) { setProfile(data); setContactEmail(data.emergency_contact_email || '') }
    setLoading(false)
  }, [router])

  useEffect(() => { loadProfile() }, [loadProfile])

  useEffect(() => {
    if (!profile) return
    const updateTimer = () => {
      const lastCI = new Date(profile.last_checkin).getTime()
      const deadline = lastCI + 24 * 60 * 60 * 1000
      setTimeLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [profile])

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') }
  }

  async function handleCheckIn() {
    if (!profile || checkingIn) return
    setCheckingIn(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('profiles').update({ last_checkin: now }).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, last_checkin: now })
      setTimeLeft(24 * 60 * 60)
      setJustCheckedIn(true)
      setTimeout(() => setJustCheckedIn(false), 3000)
    }
    setCheckingIn(false)
  }

  async function saveContact() {
    if (!profile || !contactEmail) return
    setSavingContact(true)
    const { error } = await supabase.from('profiles').update({ emergency_contact_email: contactEmail }).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, emergency_contact_email: contactEmail })
      setContactSaved(true)
      setTimeout(() => setContactSaved(false), 3000)
    }
    setSavingContact(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ color: '#444', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  const isOverdue = timeLeft === 0
  const isWarning = !isOverdue && timeLeft < 4 * 60 * 60
  const statusColor = isOverdue ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80'
  const { h, m, s } = formatTime(timeLeft)
  const progress = profile ? Math.min(100, (timeLeft / (24 * 60 * 60)) * 100) : 100
  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0a', color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 28px', borderBottom: '1px solid #1a1a1a',
        background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>Lil Lifeline</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#444' }}>{profile?.email}</div>
          <button onClick={signOut} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid #222',
            background: 'transparent', cursor: 'pointer', fontSize: 13,
            color: '#555', fontFamily: 'inherit'
          }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>

        {/* STATUS BADGE */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20,
            background: isOverdue ? 'rgba(248,113,113,0.1)' : isWarning ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)',
            border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.3)' : isWarning ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}`,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', background: statusColor,
              boxShadow: `0 0 8px ${statusColor}`
            }} />
            <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>
              {isOverdue ? 'Check-in overdue' : isWarning ? 'Check in soon' : 'You\'re all good'}
            </span>
          </div>
        </div>

        {/* TIMER RING */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            {/* Glow behind ring */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: `radial-gradient(circle, ${statusColor}0a 0%, transparent 70%)`,
              filter: 'blur(20px)'
            }} />
            <svg width="220" height="220" style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
              {/* Track */}
              <circle cx="110" cy="110" r="90" fill="none" stroke="#1a1a1a" strokeWidth="8" />
              {/* Progress */}
              <circle
                cx="110" cy="110" r="90" fill="none"
                stroke={statusColor} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                  filter: `drop-shadow(0 0 8px ${statusColor}88)`
                }}
              />
            </svg>
            {/* Time in center */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              {isOverdue ? (
                <div style={{ fontSize: 22, fontWeight: 900, color: statusColor, letterSpacing: '-1px' }}>OVERDUE</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>{h}</span>
                  <span style={{ fontSize: 22, color: '#333', fontWeight: 700 }}>:</span>
                  <span style={{ fontSize: 42, fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>{m}</span>
                  <span style={{ fontSize: 22, color: '#333', fontWeight: 700 }}>:</span>
                  <span style={{ fontSize: 42, fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>{s}</span>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#444', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                remaining
              </div>
            </div>
          </div>

          {/* Last check-in */}
          <div style={{ fontSize: 12, color: '#333', marginTop: 16 }}>
            Last check-in: <span style={{ color: '#555' }}>
              {profile ? new Date(profile.last_checkin).toLocaleString() : '—'}
            </span>
          </div>
        </div>

        {/* CHECK IN BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            style={{
              padding: '18px 56px', fontSize: 17, fontWeight: 800,
              background: 'transparent',
              color: justCheckedIn ? '#4ade80' : 'white',
              border: `2px solid ${justCheckedIn ? '#4ade80' : isOverdue ? '#f87171' : '#333'}`,
              borderRadius: 14, cursor: checkingIn ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.3px',
              boxShadow: justCheckedIn
                ? '0 0 40px rgba(74,222,128,0.3), inset 0 0 40px rgba(74,222,128,0.05)'
                : isOverdue
                ? '0 0 30px rgba(248,113,113,0.2)'
                : '0 0 0px transparent',
              transition: 'all 0.3s ease',
              position: 'relative', overflow: 'hidden'
            }}
          >
            {checkingIn ? 'Checking in...' : justCheckedIn ? '✓ Checked in!' : "I'm Okay"}
          </button>
        </div>

        {/* EMERGENCY CONTACT CARD */}
        <div style={{
          background: '#111', border: '1px solid #1f1f1f',
          borderRadius: 16, padding: 24, marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 15
            }}>📬</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Emergency contact</div>
          </div>
          <p style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>
            If you miss your check-in, this person receives an automatic email alert.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="their@email.com"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveContact()}
              style={{
                flex: 1, padding: '10px 14px', fontSize: 14,
                border: '1px solid #2a2a2a', borderRadius: 8, outline: 'none',
                background: '#0a0a0a', color: 'white', fontFamily: 'inherit'
              }}
            />
            <button
              onClick={saveContact}
              disabled={savingContact || !contactEmail}
              style={{
                padding: '10px 20px', background: 'transparent',
                color: contactEmail ? '#4ade80' : '#333',
                border: `1px solid ${contactEmail ? 'rgba(74,222,128,0.4)' : '#222'}`,
                borderRadius: 8, cursor: savingContact || !contactEmail ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap',
                fontFamily: 'inherit', transition: 'all 0.2s'
              }}
            >
              {savingContact ? '...' : 'Save'}
            </button>
          </div>

          {contactSaved && (
            <p style={{ fontSize: 13, color: '#4ade80', marginTop: 10 }}>
              ✓ Saved — they'll be notified if you miss a check-in.
            </p>
          )}
          {!profile?.emergency_contact_email && !contactSaved && (
            <p style={{ fontSize: 12, color: '#854d0e', marginTop: 10 }}>
              ⚠ No contact set yet — add one above.
            </p>
          )}
          {profile?.emergency_contact_email && !contactSaved && (
            <p style={{ fontSize: 12, color: '#444', marginTop: 10 }}>
              Currently: <span style={{ color: '#555' }}>{profile.emergency_contact_email}</span>
            </p>
          )}
        </div>

        {/* UPGRADE CARD */}
        <div style={{
          background: '#0f0f0f', border: '1px solid rgba(74,222,128,0.15)',
          borderRadius: 16, padding: 20,
          boxShadow: '0 0 30px rgba(74,222,128,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Pro coming soon</div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>
                Multiple contacts · Custom timers · Check-in history
              </div>
            </div>
            <div style={{
              fontSize: 13, color: '#4ade80', fontWeight: 700,
              padding: '6px 14px', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 8, background: 'rgba(74,222,128,0.05)'
            }}>
              $2.99/mo
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}