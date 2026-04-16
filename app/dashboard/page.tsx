'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  email: string
  emergency_contact_email: string | null
  last_checkin: string
  tier: string
}

type Notification = {
  id: string
  sender_email: string
  message: string
  read: boolean
  created_at: string
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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [linkedBy, setLinkedBy] = useState<string[]>([])
  const router = useRouter()

  const loadProfile = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) { router.push('/'); return }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (error) { setLoading(false); router.push('/'); return }
    if (data) { setProfile(data); setContactEmail(data.emergency_contact_email || '') }
    setLoading(false)
  }, [router])

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_email', user.email)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }, [])

  const loadLinkedBy = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('emergency_contact_email', user.email)
    if (data) setLinkedBy(data.map((p: { email: string }) => p.email))
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => { loadNotifications() }, [loadNotifications])
  useEffect(() => { loadLinkedBy() }, [loadLinkedBy])

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

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#444', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  const isOverdue = timeLeft === 0
  const isWarning = !isOverdue && timeLeft < 4 * 60 * 60
  const statusColor = isOverdue ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80'
  const { h, m, s } = formatTime(timeLeft)
  const progress = Math.min(100, (timeLeft / (24 * 60 * 60)) * 100)
  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference - (progress / 100) * circumference
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid #1a1a1a', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* HAMBURGER */}
          <button onClick={() => setShowMenu(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 20, height: 2, background: '#555', borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: '#555', borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: '#555', borderRadius: 2 }} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>Lil Lifeline</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#444' }}>{profile?.email}</div>

          {/* BELL */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead() }} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${unreadCount > 0 ? 'rgba(251,191,36,0.4)' : '#222'}`, background: unreadCount > 0 ? 'rgba(251,191,36,0.08)' : 'transparent', cursor: 'pointer', fontSize: 16, position: 'relative', color: unreadCount > 0 ? '#fbbf24' : '#555' }}>
              🔔
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#f87171', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '2px solid #0a0a0a' }}>{unreadCount}</div>
              )}
            </button>

            {showNotifications && (
              <div style={{ position: 'absolute', right: 0, top: 44, width: 340, background: '#111', border: '1px solid #222', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 200 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
                  {notifications.length > 0 && <span style={{ fontSize: 11, color: '#444' }}>{notifications.length} alert{notifications.length !== 1 ? 's' : ''}</span>}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: '#444', fontSize: 13 }}>No notifications yet</div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a1a', background: n.read ? 'transparent' : 'rgba(248,113,113,0.05)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: n.read ? '#333' : '#f87171', boxShadow: n.read ? 'none' : '0 0 6px #f87171' }} />
                          <div>
                            <div style={{ fontSize: 13, color: n.read ? '#555' : '#ddd', lineHeight: 1.5 }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #1a1a1a' }}>
                  <div style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>{profile?.tier === 'free' ? 'Upgrade to Pro to send instant email alerts' : 'Email alerts active'}</div>
                </div>
              </div>
            )}
          </div>

          <button onClick={signOut} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #222', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#555', fontFamily: 'inherit' }}>Sign out</button>
        </div>
      </nav>

      {/* SIDE MENU OVERLAY */}
      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={() => setShowMenu(false)}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 300, background: '#111', borderRight: '1px solid #1f1f1f', padding: 28, boxShadow: '8px 0 40px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Menu</div>
              <button onClick={() => setShowMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {/* WHO HAS YOU AS CONTACT */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 14 }}>People watching over you</div>
              {linkedBy.length === 0 ? (
                <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6, padding: '12px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>
                  Nobody has added you as their emergency contact yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {linkedBy.map(email => (
                    <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
                        {email[0].toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* YOUR CONTACT */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 14 }}>Your emergency contact</div>
              <div style={{ padding: '10px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>
                {profile?.emergency_contact_email ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>
                      {profile.emergency_contact_email[0].toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.emergency_contact_email}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#333' }}>No contact set yet</div>
                )}
              </div>
            </div>

            {/* PLAN */}
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 14 }}>Your plan</div>
              <div style={{ padding: '12px 14px', background: '#0f0f0f', borderRadius: 10, border: `1px solid ${profile?.tier === 'paid' ? 'rgba(74,222,128,0.2)' : '#1a1a1a'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#666' }}>{profile?.tier === 'paid' ? 'Pro' : 'Free'}</span>
                {profile?.tier !== 'paid' && <span style={{ fontSize: 12, color: '#4ade80' }}>Upgrade →</span>}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Close dropdowns when clicking outside */}
      {showNotifications && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowNotifications(false)} />}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>

        {/* STATUS BADGE */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: isOverdue ? 'rgba(248,113,113,0.1)' : isWarning ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.3)' : isWarning ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>{isOverdue ? 'Check-in overdue' : isWarning ? 'Check in soon' : "You're all good"}</span>
          </div>
        </div>

        {/* TIMER RING */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${statusColor}0a 0%, transparent 70%)`, filter: 'blur(20px)' }} />
            <svg width="220" height="220" style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
              <circle cx="110" cy="110" r="90" fill="none" stroke="#1a1a1a" strokeWidth="8" />
              <circle cx="110" cy="110" r="90" fill="none" stroke={statusColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${statusColor}88)` }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
              <div style={{ fontSize: 11, color: '#444', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>remaining</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#333', marginTop: 16 }}>
            Last check-in: <span style={{ color: '#555' }}>{profile ? new Date(profile.last_checkin).toLocaleString() : '—'}</span>
          </div>
        </div>

        {/* CHECK IN BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <button onClick={handleCheckIn} disabled={checkingIn} style={{ padding: '18px 56px', fontSize: 17, fontWeight: 800, background: 'transparent', color: justCheckedIn ? '#4ade80' : 'white', border: `2px solid ${justCheckedIn ? '#4ade80' : isOverdue ? '#f87171' : '#333'}`, borderRadius: 14, cursor: checkingIn ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.3px', boxShadow: justCheckedIn ? '0 0 40px rgba(74,222,128,0.3)' : isOverdue ? '0 0 30px rgba(248,113,113,0.2)' : 'none', transition: 'all 0.3s ease' }}>
            {checkingIn ? 'Checking in...' : justCheckedIn ? '✓ Checked in!' : "I'm Okay"}
          </button>
        </div>

        {/* EMERGENCY CONTACT CARD */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📬</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Emergency contact</div>
          </div>
          <p style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>
            {profile?.tier === 'paid' ? 'If you miss your check-in, this person receives an immediate email alert.' : 'If you miss your check-in, this person gets an in-app notification next time they log in. Upgrade to Pro for instant email alerts.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" placeholder="their@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveContact()} style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '1px solid #2a2a2a', borderRadius: 8, outline: 'none', background: '#0a0a0a', color: 'white', fontFamily: 'inherit' }} />
            <button onClick={saveContact} disabled={savingContact || !contactEmail} style={{ padding: '10px 20px', background: 'transparent', color: contactEmail ? '#4ade80' : '#333', border: `1px solid ${contactEmail ? 'rgba(74,222,128,0.4)' : '#222'}`, borderRadius: 8, cursor: savingContact || !contactEmail ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {savingContact ? '...' : 'Save'}
            </button>
          </div>
          {contactSaved && <p style={{ fontSize: 13, color: '#4ade80', marginTop: 10 }}>✓ Saved!</p>}
          {!profile?.emergency_contact_email && !contactSaved && <p style={{ fontSize: 12, color: '#854d0e', marginTop: 10 }}>⚠ No contact set yet — add one above.</p>}
          {profile?.emergency_contact_email && !contactSaved && <p style={{ fontSize: 12, color: '#444', marginTop: 10 }}>Currently: <span style={{ color: '#555' }}>{profile.emergency_contact_email}</span></p>}
        </div>

        {/* UPGRADE CARD */}
        {profile?.tier !== 'paid' && (
          <div style={{ background: '#0f0f0f', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 16, padding: 20, boxShadow: '0 0 30px rgba(74,222,128,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Upgrade to Pro</div>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>Instant email alerts · Multiple contacts · Custom timers</div>
              </div>
              <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 700, padding: '6px 14px', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, background: 'rgba(74,222,128,0.05)' }}>$2.99/mo</div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}