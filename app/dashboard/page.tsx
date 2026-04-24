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
  timer_mode: string
  timer_duration_hours: number
  timer_fixed_time: string | null
  grace_period_minutes: number
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

type EmergencyContact = {
  id: string
  email: string
  name: string | null
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

function getTimerStatus(profile: Profile): { phase: 'ok' | 'grace' | 'overdue'; displaySeconds: number; totalSeconds: number } {
  const now = Date.now()
  const lastCI = new Date(profile.last_checkin).getTime()
  const graceMs = profile.grace_period_minutes * 60 * 1000

  if (profile.timer_mode === 'fixed' && profile.timer_fixed_time) {
    const [hours, minutes] = profile.timer_fixed_time.split(':').map(Number)

    const todayDeadline = new Date()
    todayDeadline.setHours(hours, minutes, 0, 0)

    const yesterdayDeadline = new Date(todayDeadline)
    yesterdayDeadline.setDate(yesterdayDeadline.getDate() - 1)

    // Which deadline are we working with?
    let relevantDeadline: Date
    if (lastCI > yesterdayDeadline.getTime()) {
      relevantDeadline = todayDeadline
    } else {
      relevantDeadline = yesterdayDeadline
    }

    const msFromDeadline = now - relevantDeadline.getTime()

    if (msFromDeadline < 0) {
      return { phase: 'ok', displaySeconds: Math.floor(-msFromDeadline / 1000), totalSeconds: Math.floor((relevantDeadline.getTime() - new Date(relevantDeadline).setHours(0,0,0,0)) / 1000) }
    } else if (msFromDeadline < graceMs) {
      return { phase: 'grace', displaySeconds: Math.floor((graceMs - msFromDeadline) / 1000), totalSeconds: profile.grace_period_minutes * 60 }
    } else {
      return { phase: 'overdue', displaySeconds: 0, totalSeconds: 0 }
    }
  } else {
    // Duration mode
    const durationMs = profile.timer_duration_hours * 60 * 60 * 1000
    const elapsed = now - lastCI

    if (elapsed < durationMs) {
      return { phase: 'ok', displaySeconds: Math.floor((durationMs - elapsed) / 1000), totalSeconds: profile.timer_duration_hours * 3600 }
    } else if (elapsed < durationMs + graceMs) {
      return { phase: 'grace', displaySeconds: Math.floor((durationMs + graceMs - elapsed) / 1000), totalSeconds: profile.grace_period_minutes * 60 }
    } else {
      return { phase: 'overdue', displaySeconds: 0, totalSeconds: 0 }
    }
  }
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [timerStatus, setTimerStatus] = useState<{ phase: 'ok' | 'grace' | 'overdue'; displaySeconds: number; totalSeconds: number }>({ phase: 'ok', displaySeconds: 86400, totalSeconds: 86400 })
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [justCheckedIn, setJustCheckedIn] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showTimerSettings, setShowTimerSettings] = useState(false)
  const [linkedBy, setLinkedBy] = useState<string[]>([])
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([])
  const [extraContacts, setExtraContacts] = useState<EmergencyContact[]>([])
  const [newContactEmail, setNewContactEmail] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [addingContact, setAddingContact] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [savingTimer, setSavingTimer] = useState(false)
  // Local timer settings state
  const [localTimerMode, setLocalTimerMode] = useState('duration')
  const [localDurationHours, setLocalDurationHours] = useState(24)
  const [localFixedTime, setLocalFixedTime] = useState('09:00')
  const [localGraceMinutes, setLocalGraceMinutes] = useState(60)
  const router = useRouter()

  const loadProfile = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) { router.push('/'); return }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) { setLoading(false); router.push('/'); return }
    if (data) {
      setProfile(data)
      setContactEmail(data.emergency_contact_email || '')
      setLocalTimerMode(data.timer_mode || 'duration')
      setLocalDurationHours(data.timer_duration_hours || 24)
      setLocalFixedTime(data.timer_fixed_time || '09:00')
      setLocalGraceMinutes(data.grace_period_minutes || 60)
    }
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

  const loadExtraContacts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('emergency_contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    if (data) setExtraContacts(data)
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => { loadNotifications() }, [loadNotifications])
  useEffect(() => { loadLinkedBy() }, [loadLinkedBy])
  useEffect(() => { loadContactHistory() }, [loadContactHistory])
  useEffect(() => { loadExtraContacts() }, [loadExtraContacts])

  useEffect(() => {
    if (!profile) return
    const update = () => setTimerStatus(getTimerStatus(profile))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [profile])

  const { phase, displaySeconds, totalSeconds } = timerStatus
  const isOverdue = phase === 'overdue'
  const inGrace = phase === 'grace'
  const statusColor = isOverdue ? '#f87171' : inGrace ? '#fbbf24' : '#4ade80'

  function pad(n: number) { return String(n).padStart(2, '0') }
  function fmt(secs: number) {
    return { h: pad(Math.floor(secs / 3600)), m: pad(Math.floor((secs % 3600) / 60)), s: pad(secs % 60) }
  }

  const display = fmt(displaySeconds)
  const progress = totalSeconds > 0 ? Math.min(100, (displaySeconds / totalSeconds) * 100) : 0
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  async function handleCheckIn() {
    if (!profile || checkingIn) return
    setCheckingIn(true)
    const now = new Date().toISOString()
    const wasLate = inGrace

    const { error } = await supabase.from('profiles').update({ last_checkin: now }).eq('id', profile.id)
    if (!error) {
      // Record in history
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('checkin_history').insert({
          user_id: user.id,
          checked_in_at: now,
          timer_mode: profile.timer_mode,
          was_late: wasLate
        })
      }
      setProfile({ ...profile, last_checkin: now })
      setJustCheckedIn(true)
      setTimeout(() => setJustCheckedIn(false), 3000)
    }
    setCheckingIn(false)
  }

  async function saveTimerSettings() {
    if (!profile) return
    setSavingTimer(true)
    const updates = {
      timer_mode: localTimerMode,
      timer_duration_hours: localDurationHours,
      timer_fixed_time: localTimerMode === 'fixed' ? localFixedTime : null,
      grace_period_minutes: localGraceMinutes
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    if (!error) {
      setProfile({ ...profile, ...updates })
      setShowTimerSettings(false)
    }
    setSavingTimer(false)
  }

  async function saveContact(newEmail?: string) {
    if (!profile) return
    const emailToSave = newEmail || contactEmail
    if (!emailToSave) return
    setSavingContact(true)
    if (profile.emergency_contact_email && profile.emergency_contact_email !== emailToSave) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('contact_history').insert({ user_id: user.id, contact_email: profile.emergency_contact_email })
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

  async function addExtraContact() {
    if (!newContactEmail || addingContact) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAddingContact(true)
    const { error } = await supabase.from('emergency_contacts').insert({ user_id: user.id, email: newContactEmail, name: newContactName || null })
    if (!error) { await loadExtraContacts(); setNewContactEmail(''); setNewContactName(''); setShowAddForm(false) }
    setAddingContact(false)
  }

  async function removeExtraContact(id: string) {
    await supabase.from('emergency_contacts').delete().eq('id', id)
    await loadExtraContacts()
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
  const hasContact = !!profile?.emergency_contact_email
  const isPaid = profile?.tier === 'paid'
  const maxContacts = isPaid ? 5 : 1
  const totalContacts = extraContacts.length + (hasContact ? 1 : 0)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPaid && (
            <button onClick={() => router.push('/dashboard/history')} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #222', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
            </button>
          )}
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
                  <div style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>{isPaid ? 'Email alerts active' : 'Upgrade to Pro for instant email alerts'}</div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </nav>

      {showMenu && (
        <SideMenu isLoggedIn={true} profile={profile} linkedBy={linkedBy} contactHistory={contactHistory} onClose={() => setShowMenu(false)} currentPage="dashboard" onContactChange={(email) => saveContact(email)} />
      )}
      {showNotifications && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowNotifications(false)} />}

      {/* TIMER SETTINGS MODAL */}
      {showTimerSettings && isPaid && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.75)' }} onClick={() => setShowTimerSettings(false)} />
          <div style={{ position: 'relative', background: '#111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Timer Settings</h3>
              <button onClick={() => setShowTimerSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 22, padding: 0, lineHeight: 1 }}>×</button>
            </div>

            {/* Timer mode */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Timer mode</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ value: 'duration', label: 'Duration', desc: 'e.g. every 24 hours' }, { value: 'fixed', label: 'Fixed time', desc: 'e.g. check in by 6pm' }].map(m => (
                  <button key={m.value} onClick={() => setLocalTimerMode(m.value)} style={{ flex: 1, padding: '12px', background: localTimerMode === m.value ? 'rgba(74,222,128,0.08)' : '#0f0f0f', border: `1px solid ${localTimerMode === m.value ? 'rgba(74,222,128,0.4)' : '#2a2a2a'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: localTimerMode === m.value ? '#4ade80' : '#888', marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#444' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration settings */}
            {localTimerMode === 'duration' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Check-in interval</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[12, 24, 36, 48, 60, 72, 96, 120].map(h => (
                    <button key={h} onClick={() => setLocalDurationHours(h)} style={{ padding: '10px 6px', background: localDurationHours === h ? 'rgba(74,222,128,0.08)' : '#0f0f0f', border: `1px solid ${localDurationHours === h ? 'rgba(74,222,128,0.4)' : '#2a2a2a'}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: localDurationHours === h ? '#4ade80' : '#666', fontFamily: 'inherit' }}>{h}h</button>
                  ))}
                </div>
              </div>
            )}

            {/* Fixed time settings */}
            {localTimerMode === 'fixed' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Daily check-in deadline</div>
                <input type="time" value={localFixedTime} onChange={e => setLocalFixedTime(e.target.value)} style={{ width: '100%', padding: '12px 14px', fontSize: 16, border: '1px solid #2a2a2a', borderRadius: 8, outline: 'none', background: '#0a0a0a', color: 'white', fontFamily: 'inherit' }} />
                <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>You must check in before this time every day.</div>
              </div>
            )}

            {/* Grace period */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Grace period</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[30, 60, 90, 120, 180, 240, 360, 480].map(m => (
                  <button key={m} onClick={() => setLocalGraceMinutes(m)} style={{ padding: '10px 6px', background: localGraceMinutes === m ? 'rgba(74,222,128,0.08)' : '#0f0f0f', border: `1px solid ${localGraceMinutes === m ? 'rgba(74,222,128,0.4)' : '#2a2a2a'}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: localGraceMinutes === m ? '#4ade80' : '#666', fontFamily: 'inherit' }}>
                    {m < 60 ? `${m}m` : `${m/60}h`}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Extra time before your contact is alerted.</div>
            </div>

            <button onClick={saveTimerSettings} disabled={savingTimer} style={{ width: '100%', padding: 12, fontSize: 14, fontWeight: 700, background: 'transparent', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 8, cursor: savingTimer ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {savingTimer ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>

        {/* STATUS */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: isOverdue ? 'rgba(248,113,113,0.1)' : inGrace ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.3)' : inGrace ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>{isOverdue ? 'Alert sent to your contact' : inGrace ? 'Grace period — check in now' : "You're all good"}</span>
          </div>
        </div>

        {/* TIMER */}
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
              {!inGrace && !isOverdue && (
                <div style={{ fontSize: 10, color: '#333', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {profile?.timer_mode === 'fixed' ? `Daily by ${profile.timer_fixed_time}` : `${profile?.timer_duration_hours}h timer`}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: inGrace ? '#fbbf24' : '#3a3a3a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {isOverdue ? 'Overdue' : inGrace ? `Grace Period — ${profile?.grace_period_minutes}min` : 'Check-in Window'}
            </div>
            <div style={{ fontSize: 12, color: '#2a2a2a' }}>Last check-in: <span style={{ color: '#555' }}>{profile ? new Date(profile.last_checkin).toLocaleString() : '—'}</span></div>
          </div>

          {/* Timer settings button for Pro */}
          {isPaid && (
            <button onClick={() => setShowTimerSettings(true)} style={{ marginTop: 12, padding: '7px 16px', background: 'transparent', border: '1px solid #222', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#444', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 4.93a10 10 0 0 0 0 14.14m14.14 0a10 10 0 0 0 0-14.14"/></svg>
              Adjust timer settings
            </button>
          )}
        </div>

        {/* CHECK IN BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
          <button onClick={handleCheckIn} disabled={checkingIn} style={{ padding: '20px 72px', fontSize: 18, fontWeight: 800, background: 'transparent', color: justCheckedIn ? '#4ade80' : 'white', border: `2px solid ${justCheckedIn ? '#4ade80' : isOverdue ? '#f87171' : inGrace ? '#fbbf24' : '#2a2a2a'}`, borderRadius: 16, cursor: checkingIn ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.3px', boxShadow: justCheckedIn ? '0 0 50px rgba(74,222,128,0.35)' : isOverdue ? '0 0 30px rgba(248,113,113,0.25)' : inGrace ? '0 0 30px rgba(251,191,36,0.2)' : 'none', transition: 'all 0.3s ease' }}>
            {checkingIn ? 'Checking in...' : justCheckedIn ? '✓ Checked in!' : "I'm Okay"}
          </button>
        </div>

        {/* EMERGENCY CONTACTS */}
        <div style={{ background: '#111', border: `1px solid ${hasContact ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.35)'}`, borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: hasContact ? 'none' : '0 0 30px rgba(248,113,113,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: hasContact ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${hasContact ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasContact ? '#4ade80' : '#f87171', flexShrink: 0 }}>
                <PersonAlertIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Who should we alert?</div>
                <div style={{ fontSize: 12, color: '#444' }}>{isPaid ? `${totalContacts} of ${maxContacts} contacts` : 'If you do not check in before the grace period ends'}</div>
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
            {isPaid ? 'All contacts below will receive an immediate email alert if you miss your check-in.' : 'This person will get an in-app notification next time they log in. Upgrade to Pro for instant email alerts.'}
          </p>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Primary contact</div>
            <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" placeholder="Search by email..." value={contactEmail} onChange={async e => { setContactEmail(e.target.value); if (e.target.value.length >= 2) { setSearching(true); setShowDropdown(true); const res = await fetch(`/api/search-users?q=${encodeURIComponent(e.target.value)}`); const { users } = await res.json(); setSearchResults(users); setSearching(false); } else { setShowDropdown(false); setSearchResults([]); } }} onKeyDown={e => e.key === 'Enter' && saveContact()} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '1px solid #2a2a2a', borderRadius: 8, outline: 'none', background: '#0a0a0a', color: 'white', fontFamily: 'inherit' }} />
              <button onClick={() => saveContact()} disabled={savingContact || !contactEmail} style={{ padding: '10px 20px', background: 'transparent', color: contactEmail ? '#4ade80' : '#333', border: `1px solid ${contactEmail ? 'rgba(74,222,128,0.4)' : '#222'}`, borderRadius: 8, cursor: savingContact || !contactEmail ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {savingContact ? '...' : 'Save'}
              </button>
            </div>
            </div>
            {showDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, marginTop: 4, zIndex: 50, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                {searching ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#444' }}>Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#444' }}>No users found - you can still save any email</div>
                ) : (
                  searchResults.map(email => (
                    <div key={email} onClick={() => { setContactEmail(email); setShowDropdown(false); }} style={{ padding: '12px 14px', fontSize: 13, color: '#888', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 10 }} onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>{email[0].toUpperCase()}</div>
                      {email}
                    </div>
                  ))
                )}
              </div>
            )}
            {showDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowDropdown(false)} />}
            {contactSaved && <p style={{ fontSize: 13, color: '#4ade80', marginTop: 8 }}>✓ Saved!</p>}
          </div>

          {isPaid && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Additional contacts</div>
              {extraContacts.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1f1f1f', marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>{(c.name || c.email)[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {c.name && <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>{c.name}</div>}
                    <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                  </div>
                  <button onClick={() => removeExtraContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: 18, lineHeight: 1, padding: '4px', flexShrink: 0 }}>×</button>
                </div>
              ))}
              {totalContacts < maxContacts && (
                !showAddForm ? (
                  <button onClick={() => setShowAddForm(true)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed #2a2a2a', borderRadius: 10, cursor: 'pointer', color: '#444', fontSize: 13, fontFamily: 'inherit', marginTop: 4 }}>+ Add another contact</button>
                ) : (
                  <div style={{ background: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: 10, padding: 14, marginTop: 4 }}>
                    <input type="text" placeholder="Name (optional)" value={newContactName} onChange={e => setNewContactName(e.target.value)} style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #2a2a2a', borderRadius: 8, outline: 'none', background: '#0a0a0a', color: 'white', fontFamily: 'inherit', marginBottom: 8 }} />
                    <input type="email" placeholder="Email address" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExtraContact()} style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #2a2a2a', borderRadius: 8, outline: 'none', background: '#0a0a0a', color: 'white', fontFamily: 'inherit', marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setShowAddForm(false); setNewContactEmail(''); setNewContactName('') }} style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer', color: '#555', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                      <button onClick={addExtraContact} disabled={addingContact || !newContactEmail} style={{ flex: 1, padding: '9px', background: 'transparent', border: `1px solid ${newContactEmail ? 'rgba(74,222,128,0.4)' : '#222'}`, borderRadius: 8, cursor: addingContact || !newContactEmail ? 'not-allowed' : 'pointer', color: newContactEmail ? '#4ade80' : '#333', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                        {addingContact ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )
              )}
              {totalContacts >= maxContacts && <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginTop: 8 }}>Maximum {maxContacts} contacts reached</div>}
            </div>
          )}

          {!isPaid && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)', borderRadius: 8, fontSize: 12, color: '#444' }}>
              Upgrade to Pro to add up to 5 emergency contacts.
            </div>
          )}
        </div>

        {/* PRICING CARDS */}
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
              <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>MOST POPULAR</div>
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
              {isPaid ? (
                <div style={{ marginTop: 22, padding: 11, fontSize: 13, textAlign: 'center', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8 }}>✓ Your current plan</div>
              ) : (
                <button onClick={async () => { const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: profile?.id, email: profile?.email }) }); const { url } = await res.json(); if (url) window.location.href = url; }} style={{ width: '100%', marginTop: 22, padding: 11, fontSize: 14, fontWeight: 600, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, cursor: 'pointer', color: '#4ade80', fontFamily: 'inherit' }}>Upgrade to Pro →</button>
              )}
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
              <button disabled style={{ width: '100%', marginTop: 22, padding: 11, fontSize: 14, fontWeight: 600, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 8, cursor: 'not-allowed', color: '#60a5fa', fontFamily: 'inherit' }}>Coming soon</button>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
