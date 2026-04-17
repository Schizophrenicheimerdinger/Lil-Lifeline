'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SideMenu from '../components/SideMenu'

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

type ContactHistory = {
  id: string
  contact_email: string
  linked_at: string
}

function BellIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function PersonAlertIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <line x1="19" y1="8" x2="19" y2="13" />
      <circle cx="19" cy="16" r="0.5" fill="currentColor" />
    </svg>
  )
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [elapsed, setElapsed] = useState(0)
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
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([])
  const router = useRouter()

  const PHASE1 = 24 * 60 * 60
  const GRACE  =  1 * 60 * 60
  const TOTAL  = PHASE1 + GRACE

  const loadProfile = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) { router.push('/'); return }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) { setLoading(false); router.push('/'); return }
    if (data) { setProfile(data); setContactEmail(data.emergency_contact_email || '') }
    setLoading(false)
  }, [router])

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('recipient_email', user.email).order('created_at', { ascending: false }).limit(20)
    if (data) setNotifications(data)
  }, [])

  const loadLinkedBy = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('email').eq('emergency_contact_email', user.email)
    if (data) setLinkedBy(data.map((p: { email: string }) => p.email))
  }, [])

  const loadContactHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('contact_history').select('*').eq('user_id', user.id).order('linked_at', { ascending: false }).limit(10)
    if (data) setContactHistory(data)
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => { loadNotifications() }, [loadNotifications])
  useEffect(() => { loadLinkedBy() }, [loadLinkedBy])
  useEffect(() => { loadContactHistory() }, [loadContactHistory])

  useEffect(() => {
    if (!profile) return
    const update = () => {
      const secs = Math.floor((Date.now() - new Date(profile.last_checkin).getTime()) / 1000)
      setElapsed(Math.min(secs, TOTAL))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [profile, TOTAL])

  const inGrace    = elapsed >= PHASE1
  const isOverdue  = elapsed >= TOTAL
  const phase1Left = Math.max(0, PHASE1 - elapsed)
  const graceLeft  = Math.max(0, TOTAL - elapsed)
  const graceProgress = inGrace ? (graceLeft / GRACE) : 1
  const statusColor = isOverdue ? '#f87171' : inGrace
    ? `rgb(${Math.round(251 + (248 - 251) * (1 - graceProgress))}, ${Math.round(191 + (113 - 191) * (1 - graceProgress))}, 36)`
    : '#4ade80'

  function pad(n: number) { return String(n).padStart(2, '0') }
  function fmt(secs: number) {
    return { h: pad(Math.floor(secs / 3600)), m: pad(Math.floor((secs % 3600) / 60)), s: pad(secs % 60) }
  }

  const display  = inGrace ? fmt(graceLeft) : fmt(phase1Left)
  const progress = inGrace ? (graceLeft / GRACE) * 100 : (phase1Left / PHASE1) * 100
  const circumference    = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (Math.min(100, progress) / 100) * circumference

  async function handleCheckIn() {
    if (!profile || checkingIn) return
    setCheckingIn(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('profiles').update({ last_checkin: now }).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, last_checkin: now })
      setElapsed(0)
      setJustCheckedIn(true)
      setTimeout(() => setJustCheckedIn(false), 3000)
    }
    setCheckingIn(false)
  }

  async function saveContact(newEmail?: string) {
    if (!profile) return
    const emailToSave = newEmail || contactEmail
    if (!emailToSave) return
    setSavingContact(true)

    // Save old contact to history if it's different
    if (profile.emergency_contact_email && profile.emergency_contact_email !== emailToSave) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('contact_history').insert({
          user_id: user.id,
          contact_email: profile.emergency_contact_email
        })
        await loadContactHistory()
      }
    }

    const { error } = await supabase.from('profiles').update({ emergency_contact_email: emailToSave }).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, emergency_contact_email: emailToSave })
      setContactEmail(emailToSave)
      setContactSaved(true)
      setTimeout(() => setContactSaved(false), 3000)
    }
    setSavingContact(false)
  }

  async function markAllRead() {
    const ids = notifications.filter(n => !n.read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ read: true }).in('id', ids)
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

  const unreadCount = notifications.filter(n => !n.read).length
  const hasContact  = !!profile?.emergency_contact_email

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid #1a1a1a', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowMenu(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 20, height: 2, background: '#555', borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: '#555', borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: '#555', borderRadius: 2 }} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>Lil Lifeline</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#444' }}>{profile?.email}</div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead() }} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${unreadCount > 0 ? 'rgba(251,191,36,0.4)' : '#222'}`, background: unreadCount > 0 ? 'rgba(251,191,36,0.08)' : 'transparent', cursor: 'pointer', position: 'relative', color: unreadCount > 0 ? '#fbbf24' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BellIcon size={17} color={unreadCount > 0 ? '#fbbf24' : '#555'} />
              {unreadCount > 0 && <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#f87171', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '2px solid #0a0a0a' }}>{unreadCount}</div>}
            </button>
            {showNotifications && (
              <div style={{ position: 'absolute', right: 0, top: 44, width: 340, background: '#111', border: '1px solid #222', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 200 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
                  {notifications.length > 0 && <span style={{ fontSize: 11, color: '#444' }}>{notifications.length} alert{notifications.length !== 1 ? 's' : ''}</span>}
                </div>
                {notifications.length === 0
                  ? <div style={{ padding: '28px 16px', textAlign: 'center', color: '#444', fontSize: 13 }}>No notifications yet</div>
                  : <div style={{ maxHeight: 320, overflowY: 'auto' }}>
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
                }
                <div style={{ padding: '10px 16px', borderTop: '1px solid #1a1a1a' }}>
                  <div style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>{profile?.tier === 'free' ? 'Upgrade to Pro for instant email alerts' : 'Email alerts active'}</div>
                </div>
              </div>
            )}
          </div>
          <button onClick={signOut} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #222', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#555', fontFamily: 'inherit' }}>Sign out</button>
        </div>
      </nav>

      {showNotifications && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowNotifications(false)} />}

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: isOverdue ? 'rgba(248,113,113,0.1)' : inGrace ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.3)' : inGrace ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>{isOverdue ? 'Alert sent to your contact' : inGrace ? 'Grace period — check in now' : "You're all good"}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <div style={{ position: 'relative', width: 290, height: 290 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${statusColor}12 0%, transparent 70%)`, filter: 'blur(24px)' }} />
            <svg width="290" height="290" style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
              <circle cx="145" cy="145" r="120" fill="none" stroke="#1a1a1a" strokeWidth="10" />
              <circle cx="145" cy="145" r="120" fill="none" stroke={statusColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease', filter: `drop-shadow(0 0 10px ${statusColor}99)` }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {isOverdue ? (
                <div style={{ fontSize: 26, fontWeight: 900, color: statusColor, letterSpacing: '-1px' }}>OVERDUE</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>{display.h}</span>
                  <span style={{ fontSize: 28, color: '#2a2a2a', fontWeight: 700 }}>:</span>
                  <span style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>{display.m}</span>
                  <span style={{ fontSize: 28, color: '#2a2a2a', fontWeight: 700 }}>:</span>
                  <span style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>{display.s}</span>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#444', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>remaining</div>
              {inGrace && !isOverdue && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Grace Period</div>}
              {!inGrace && !isOverdue && <div style={{ fontSize: 10, color: '#333', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Phase 1 · 1hr grace after</div>}
            </div>
          </div>
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: inGrace ? '#fbbf24' : '#3a3a3a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {isOverdue ? 'Overdue' : inGrace ? 'Phase 2 — Grace Period' : 'Phase 1 — Check-in Window'}
            </div>
            <div style={{ fontSize: 12, color: '#2a2a2a' }}>Last check-in: <span style={{ color: '#555' }}>{profile ? new Date(profile.last_checkin).toLocaleString() : '—'}</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
          <button onClick={handleCheckIn} disabled={checkingIn} style={{ padding: '20px 72px', fontSize: 18, fontWeight: 800, background: 'transparent', color: justCheckedIn ? '#4ade80' : 'white', border: `2px solid ${justCheckedIn ? '#4ade80' : isOverdue ? '#f87171' : inGrace ? '#fbbf24' : '#2a2a2a'}`, borderRadius: 16, cursor: checkingIn ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.3px', boxShadow: justCheckedIn ? '0 0 50px rgba(74,222,128,0.35)' : isOverdue ? '0 0 30px rgba(248,113,113,0.25)' : inGrace ? '0 0 30px rgba(251,191,36,0.2)' : 'none', transition: 'all 0.3s ease' }}>
            {checkingIn ? 'Checking in...' : justCheckedIn ? '✓ Checked in!' : "I'm Okay"}
          </button>
        </div>

        <div style={{ background: '#111', border: `1px solid ${hasContact ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.35)'}`, borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: hasContact ? 'none' : '0 0 30px rgba(248,113,113,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: hasContact ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${hasContact ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasContact ? '#4ade80' : '#f87171', flexShrink: 0 }}>
                <PersonAlertIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Who should we alert?</div>
                <div style={{ fontSize: 12, color: '#444' }}>If you do not check in before the grace period ends</div>
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: hasContact ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${hasContact ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.3)'}`, flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasContact ? '#4ade80' : '#f87171', boxShadow: `0 0 6px ${hasContact ? '#4ade80' : '#f87171'}` }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: hasContact ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>{hasContact ? 'Contact set' : 'No contact set'}</span>
            </div>
          </div>
          {!hasContact && (
            <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
              Without an emergency contact, nobody will be notified if you miss your check-in.
            </div>
          )}
          <p style={{ fontSize: 13, color: '#444', marginBottom: 14, lineHeight: 1.6 }}>
            {profile?.tier === 'paid' ? 'This person will receive an immediate email alert if you miss your check-in and grace period.' : 'This person will get an in-app notification next time they log in. Upgrade to Pro to send them an instant email alert instead.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" placeholder="their@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveContact()} style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '1px solid #2a2a2a', borderRadius: 8, outline: 'none', background: '#0a0a0a', color: 'white', fontFamily: 'inherit' }} />
            <button onClick={() => saveContact()} disabled={savingContact || !contactEmail} style={{ padding: '10px 20px', background: 'transparent', color: contactEmail ? '#4ade80' : '#333', border: `1px solid ${contactEmail ? 'rgba(74,222,128,0.4)' : '#222'}`, borderRadius: 8, cursor: savingContact || !contactEmail ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {savingContact ? '...' : 'Save'}
            </button>
          </div>
          {contactSaved && <p style={{ fontSize: 13, color: '#4ade80', marginTop: 10 }}>Saved!</p>}
          {hasContact && !contactSaved && <p style={{ fontSize: 12, color: '#3a3a3a', marginTop: 10 }}>Currently: <span style={{ color: '#555' }}>{profile?.emergency_contact_email}</span></p>}
        </div>

        <div style={{ marginTop: 48 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#333', textAlign: 'center', marginBottom: 20 }}>Upgrade your plan</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160, background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Free</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 14 }}>$0</div>
              {['1 emergency contact', '24h + 1hr grace timer', 'In-app notifications'].map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: '#444' }}><span style={{ color: '#333' }}>✓</span>{f}</div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 160, background: '#0f0f0f', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 14, padding: 20, boxShadow: '0 0 28px rgba(74,222,128,0.07)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>COMING SOON</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>Pro</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 2, color: 'white' }}>$2.99</div>
              <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 14 }}>or $24.99/yr — save $11</div>
              {['Up to 5 contacts', 'Instant email alerts', 'Custom timers', 'Check-in history'].map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: '#666' }}><span style={{ color: '#4ade80' }}>✓</span>{f}</div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 160, background: '#0f0f0f', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 14, padding: 20, boxShadow: '0 0 28px rgba(96,165,250,0.07)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#1d4ed8', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>BEST VALUE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa' }}>Family</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 2, color: 'white' }}>$7.99</div>
              <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 14 }}>5 members · $1.60/person</div>
              {['Everything in Pro', '5 member accounts', 'Family dashboard', 'Group alerts'].map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: '#666' }}><span style={{ color: '#60a5fa' }}>✓</span>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showMenu && (
        <SideMenu
          isLoggedIn={true}
          profile={profile}
          linkedBy={linkedBy}
          contactHistory={contactHistory}
          onClose={() => setShowMenu(false)}
          currentPage="dashboard"
          onContactChange={(email) => saveContact(email)}
        />
      )}
    </main>
  )
}
