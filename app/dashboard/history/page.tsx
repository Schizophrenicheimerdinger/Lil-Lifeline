'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type CheckinRecord = {
  id: string
  checked_in_at: string
  timer_mode: string
  was_late: boolean
  user_email?: string
}

export default function HistoryPage() {
  const [myHistory, setMyHistory] = useState<CheckinRecord[]>([])
  const [watchingHistory, setWatchingHistory] = useState<CheckinRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mine' | 'watching'>('mine')
  const router = useRouter()

  const loadHistory = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) { router.push('/'); return }

    // Check tier
    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (!profile || profile.tier !== 'paid') { router.push('/dashboard'); return }

    // My own check-in history
    const { data: mine } = await supabase
      .from('checkin_history')
      .select('*')
      .eq('user_id', user.id)
      .order('checked_in_at', { ascending: false })
      .limit(50)
    if (mine) setMyHistory(mine)

    // History of people who have me as emergency contact
    const { data: watching } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('emergency_contact_email', user.email)

    if (watching && watching.length > 0) {
      const ids = watching.map(p => p.id)
      const { data: theirHistory } = await supabase
        .from('checkin_history')
        .select('*, profiles!inner(email)')
        .in('user_id', ids)
        .order('checked_in_at', { ascending: false })
        .limit(100)

      if (theirHistory) {
        setWatchingHistory(theirHistory.map((h: any) => ({
          ...h,
          user_email: h.profiles?.email
        })))
      }
    }

    setLoading(false)
  }, [router])

  useEffect(() => { loadHistory() }, [loadHistory])

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
  }

  function getDayLabel(dateStr: string) {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#444', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  const currentHistory = activeTab === 'mine' ? myHistory : watchingHistory

  // Group by day
  const grouped: { [day: string]: CheckinRecord[] } = {}
  currentHistory.forEach(h => {
    const day = getDayLabel(h.checked_in_at)
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(h)
  })

  const onTime = currentHistory.filter(h => !h.was_late).length
  const late = currentHistory.filter(h => h.was_late).length

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid #1a1a1a', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'inherit' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>
            Back
          </button>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Check-in History</div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80' }}>Pro</span>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Total', value: currentHistory.length, color: 'white' },
            { label: 'On time', value: onTime, color: '#4ade80' },
            { label: 'Late / grace', value: late, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        {watchingHistory.length > 0 && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#111', borderRadius: 10, padding: 4, border: '1px solid #1f1f1f' }}>
            {(['mine', 'watching'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, background: activeTab === tab ? '#1f1f1f' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: activeTab === tab ? 'white' : '#444', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {tab === 'mine' ? 'My check-ins' : 'People I watch'}
              </button>
            ))}
          </div>
        )}

        {/* History list */}
        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#333', fontSize: 14 }}>No check-ins recorded yet.</div>
        ) : (
          Object.entries(grouped).map(([day, records]) => (
            <div key={day} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#333', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{day}</div>
              {records.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: r.was_late ? '#fbbf24' : '#4ade80', boxShadow: `0 0 6px ${r.was_late ? '#fbbf24' : '#4ade80'}` }} />
                  <div style={{ flex: 1 }}>
                    {r.user_email && <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>{r.user_email}</div>}
                    <div style={{ fontSize: 13, color: r.was_late ? '#fbbf24' : '#ccc', fontWeight: 500 }}>
                      {r.was_late ? 'Checked in during grace period' : 'Checked in on time'}
                    </div>
                    <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                      {formatDate(r.checked_in_at)} · {r.timer_mode === 'fixed' ? 'Fixed time' : 'Duration timer'}
                    </div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.was_late ? 'rgba(251,191,36,0.2)' : 'rgba(74,222,128,0.2)', border: `1px solid ${r.was_late ? 'rgba(251,191,36,0.4)' : 'rgba(74,222,128,0.4)'}` }} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </main>
  )
}
