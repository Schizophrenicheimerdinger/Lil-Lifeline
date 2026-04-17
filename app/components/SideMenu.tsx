'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  function navigate(path: string) {
    onClose()
    router.push(path)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={onClose}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 300, background: '#111', borderRight: '1px solid #1f1f1f', padding: 28, boxShadow: '8px 0 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Menu</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
          </div>

          {/* Navigation */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 14 }}>Navigation</div>
            {currentPage === 'dashboard' ? (
              <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, cursor: 'pointer', color: '#888', fontSize: 13, fontFamily: 'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                Home
              </button>
            ) : (
              <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: '#0f0f0f', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, cursor: 'pointer', color: '#4ade80', fontSize: 13, fontFamily: 'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                Check in
              </button>
            )}
          </div>

          {/* People watching over you */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 14 }}>People watching over you</div>
            {!isLoggedIn ? (
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8, padding: '12px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 13, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>Sign in</button>
                {' '}or{' '}
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 13, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>create an account</button>
                {' '}to see who is watching over you.
              </div>
            ) : linkedBy.length === 0 ? (
              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6, padding: '12px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>Nobody has added you as their emergency contact yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedBy.map(email => (
                  <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>{email[0].toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency contact with history */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 14 }}>Your emergency contact</div>
            {!isLoggedIn ? (
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8, padding: '12px 14px', background: '#0f0f0f', borderRadius: 10, border: '1px solid #1a1a1a' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 13, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>Sign in</button>
                {' '}or{' '}
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 13, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>create an account</button>
                {' '}to add someone to watch out for you.
              </div>
            ) : (
              <div>
                <div onClick={() => contactHistory.length > 0 && setShowHistory(!showHistory)} style={{ padding: '10px 14px', background: '#0f0f0f', borderRadius: showHistory ? '10px 10px 0 0' : 10, border: '1px solid #1a1a1a', cursor: contactHistory.length > 0 ? 'pointer' : 'default', userSelect: 'none' }}>
                  {profile?.emergency_contact_email ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>{profile.emergency_contact_email[0].toUpperCase()}</div>
                        <div style={{ fontSize: 13, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{profile.emergency_contact_email}</div>
                      </div>
                      {contactHistory.length > 0 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><polyline points="6,9 12,15 18,9"/></svg>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 13, color: '#333' }}>No contact set yet</div>
                      {contactHistory.length > 0 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6,9 12,15 18,9"/></svg>}
                    </div>
                  )}
                </div>

                {showHistory && contactHistory.length > 0 && (
                  <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', fontSize: 10, color: '#333', borderBottom: '1px solid #1a1a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Past contacts — click to restore</div>
                    {contactHistory.map(h => (
                      <div key={h.id} onClick={() => setConfirmEmail(h.contact_email)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #141414', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#151515')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#555', flexShrink: 0 }}>{h.contact_email[0].toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.contact_email}</div>
                          <div style={{ fontSize: 10, color: '#333', marginTop: 1 }}>{new Date(h.linked_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontSize: 10, color: '#333', flexShrink: 0 }}>Use →</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan */}
          {isLoggedIn && profile && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 14 }}>Your plan</div>
              <div style={{ padding: '12px 14px', background: '#0f0f0f', borderRadius: 10, border: `1px solid ${profile.tier === 'paid' ? 'rgba(74,222,128,0.2)' : '#1a1a1a'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#666' }}>{profile.tier === 'paid' ? 'Pro' : 'Free'}</span>
                {profile.tier !== 'paid' && <span style={{ fontSize: 12, color: '#4ade80' }}>Upgrade →</span>}
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 20 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#444', marginBottom: 10 }}>Contact us</div>
            <a href="mailto:sleushstore@gmail.com" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>sleushstore@gmail.com</a>
          </div>
        </div>
      </div>

      {/* Confirm popup */}
      {confirmEmail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.75)' }} onClick={() => setConfirmEmail(null)} />
          <div style={{ position: 'relative', background: '#111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, zIndex: 1, boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Change emergency contact?</h3>
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
