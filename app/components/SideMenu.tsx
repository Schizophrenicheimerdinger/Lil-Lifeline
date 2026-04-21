'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  email: string
  emergency_contact_email: string | null
  tier: string
} | null

type ContactHistory = {
  id: string
  contact_email: string
  linked_at: string
}

type Props = {
  isLoggedIn: boolean
  profile: Profile
  linkedBy: string[]
  contactHistory: ContactHistory[]
  onClose: () => void
  currentPage: 'home' | 'dashboard'
  onContactChange?: (email: string) => void
}

export default function SideMenu({ isLoggedIn, profile, linkedBy, contactHistory, onClose, currentPage, onContactChange }: Props) {
  const [showHistory, setShowHistory] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)
  const router = useRouter()

  function navigate(path: string) {
    onClose()
    router.push(path)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    onClose()
    router.push('/')
  }

  const rowStyle = (id: string, clickable = true): React.CSSProperties => ({
    padding: '14px 24px',
    borderBottom: '1px solid #141414',
    cursor: clickable ? 'pointer' : 'default',
    background: pressed === id ? '#161616' : 'transparent',
    transition: 'background 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    userSelect: 'none' as const,
  })

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={onClose}>
        <div
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 300, background: '#0f0f0f', borderRight: '1px solid #1a1a1a', boxShadow: '8px 0 40px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Lil Lifeline</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
          </div>

          {/* Navigation section */}
          <div style={{ borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ padding: '10px 24px 6px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Navigation</div>
            {currentPage === 'dashboard' ? (
              <div
                style={rowStyle('home')}
                onMouseDown={() => setPressed('home')}
                onMouseUp={() => setPressed(null)}
                onClick={() => navigate('/')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                  <span style={{ fontSize: 14, color: '#888' }}>Home</span>
                </div>
              </div>
            ) : (
              <div
                style={rowStyle('checkin')}
                onMouseDown={() => setPressed('checkin')}
                onMouseUp={() => setPressed(null)}
                onClick={() => navigate('/dashboard')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                  <span style={{ fontSize: 14, color: '#4ade80' }}>Check in</span>
                </div>
              </div>
            )}
          </div>

          {/* People watching over you */}
          <div style={{ borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ padding: '10px 24px 6px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>People watching over you</div>
            {!isLoggedIn ? (
              <div style={{ padding: '12px 24px 16px' }}>
                <span style={{ fontSize: 13, color: '#444' }}>
                  <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 13, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>Sign in</button>
                  {' '}to see who is watching over you.
                </span>
              </div>
            ) : linkedBy.length === 0 ? (
              <div style={{ padding: '12px 24px 16px', fontSize: 13, color: '#333' }}>Nobody has added you as their emergency contact yet.</div>
            ) : (
              linkedBy.map(email => (
                <div key={email} style={{ padding: '12px 24px', borderBottom: '1px solid #0d0d0d', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>{email[0].toUpperCase()}</div>
                  <div style={{ fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                </div>
              ))
            )}
          </div>

          {/* Your emergency contact */}
          <div style={{ borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ padding: '10px 24px 6px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your emergency contact</div>
            {!isLoggedIn ? (
              <div style={{ padding: '12px 24px 16px', fontSize: 13, color: '#444' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 13, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>Sign in</button>
                {' '}to add someone to watch out for you.
              </div>
            ) : (
              <div>
                <div
                  style={{ ...rowStyle('contact', contactHistory.length > 0), cursor: contactHistory.length > 0 ? 'pointer' : 'default' }}
                  onMouseDown={() => contactHistory.length > 0 && setPressed('contact')}
                  onMouseUp={() => setPressed(null)}
                  onClick={() => contactHistory.length > 0 && setShowHistory(!showHistory)}
                >
                  {profile?.emergency_contact_email ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>{profile.emergency_contact_email[0].toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.emergency_contact_email}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#333' }}>No contact set yet</div>
                  )}
                  {contactHistory.length > 0 && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 8 }}><polyline points="6,9 12,15 18,9"/></svg>
                  )}
                </div>

                {showHistory && contactHistory.length > 0 && (
                  <div style={{ background: '#0a0a0a', borderTop: '1px solid #141414' }}>
                    <div style={{ padding: '8px 24px', fontSize: 10, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Past contacts — tap to restore</div>
                    {contactHistory.map(h => (
                      <div
                        key={h.id}
                        style={{ ...rowStyle(`hist-${h.id}`), padding: '10px 24px' }}
                        onMouseDown={() => setPressed(`hist-${h.id}`)}
                        onMouseUp={() => setPressed(null)}
                        onClick={() => setConfirmEmail(h.contact_email)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#444', flexShrink: 0 }}>{h.contact_email[0].toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.contact_email}</div>
                            <div style={{ fontSize: 10, color: '#2a2a2a', marginTop: 1 }}>{new Date(h.linked_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: '#2a2a2a' }}>Use →</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan */}
          {isLoggedIn && profile && (
            <div style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ padding: '10px 24px 6px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your plan</div>
              <div style={{ padding: '12px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#666' }}>{profile.tier === 'paid' ? 'Pro' : 'Free'}</span>
                {profile.tier !== 'paid' && <span style={{ fontSize: 12, color: '#4ade80' }}>Upgrade →</span>}
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Contact us */}
          <div style={{ borderTop: '1px solid #1a1a1a' }}>
            <div style={{ padding: '10px 24px 6px', fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contact us</div>
            <div style={{ padding: '8px 24px 12px' }}>
              <a href="mailto:sleushstore@gmail.com" style={{ fontSize: 13, color: '#444', textDecoration: 'none' }}>sleushstore@gmail.com</a>
            </div>
          </div>

          {/* Sign out */}
          {isLoggedIn && (
            <div
              style={{ ...rowStyle('signout'), borderTop: '1px solid #1a1a1a', borderBottom: 'none' }}
              onMouseDown={() => setPressed('signout')}
              onMouseUp={() => setPressed(null)}
              onClick={handleSignOut}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span style={{ fontSize: 14, color: '#555' }}>Sign out</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm popup */}
      {confirmEmail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.75)' }} onClick={() => setConfirmEmail(null)} />
          <div style={{ position: 'relative', background: '#111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, zIndex: 1, boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'white' }}>Change emergency contact?</h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>This will set your emergency contact to:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid rgba(96,165,250,0.2)', marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>{confirmEmail[0].toUpperCase()}</div>
              <div style={{ fontSize: 14, color: '#aaa' }}>{confirmEmail}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmEmail(null)} style={{ flex: 1, padding: 11, background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer', color: '#555', fontSize: 14, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => { if (onContactChange) onContactChange(confirmEmail); setConfirmEmail(null); onClose(); }} style={{ flex: 1, padding: 11, background: 'transparent', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 8, cursor: 'pointer', color: '#60a5fa', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
