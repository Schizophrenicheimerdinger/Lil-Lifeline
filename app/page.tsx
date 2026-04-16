'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [showAuth, setShowAuth] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  async function handleAuth() {
    if (!email || !password) {
      setMessage('Please enter your email and password.')
      setIsError(true)
      return
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      setIsError(true)
      return
    }
    setLoading(true)
    setMessage('')
    setIsError(false)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
        setIsError(true)
      } else {
        setMessage('✅ Account created! Check your email to confirm, then sign in.')
        setIsError(false)
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
        setIsError(true)
      } else {
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 32px', borderBottom: '1px solid #f0f0f0',
        background: 'white', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>🛡️ Lil Lifeline</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { setShowAuth(true); setIsSignUp(false) }} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db',
            background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500
          }}>Sign in</button>
          <button onClick={() => { setShowAuth(true); setIsSignUp(true) }} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600
          }}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        textAlign: 'center', padding: '80px 24px 60px',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)'
      }}>
        <div style={{
          display: 'inline-block', background: '#dcfce7', color: '#16a34a',
          fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
          marginBottom: 24, letterSpacing: '0.04em'
        }}>
          A quiet safety net
        </div>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800,
          lineHeight: 1.15, marginBottom: 24, color: '#111827',
          maxWidth: 700, margin: '0 auto 24px'
        }}>
          One button to say<br />you're okay.
        </h1>
        <p style={{
          fontSize: 18, color: '#6b7280', maxWidth: 480,
          margin: '0 auto 36px', lineHeight: 1.7
        }}>
          For people living alone. Check in once a day — miss it, and your trusted contact is automatically notified.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setShowAuth(true); setIsSignUp(true) }} style={{
            padding: '14px 32px', fontSize: 16, fontWeight: 700,
            background: '#16a34a', color: 'white', border: 'none',
            borderRadius: 10, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(22,163,74,0.3)'
          }}>
            Get started — it's free
          </button>
          <button onClick={() => { setShowAuth(true); setIsSignUp(false) }} style={{
            padding: '14px 32px', fontSize: 16, fontWeight: 600,
            background: 'white', color: '#374151', border: '1px solid #e5e7eb',
            borderRadius: 10, cursor: 'pointer'
          }}>
            Sign in
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
          No app download needed · Works on any phone
        </p>
      </section>

      {/* STATS */}
      <section style={{
        display: 'flex', justifyContent: 'center', gap: 0,
        borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6',
        background: 'white', flexWrap: 'wrap'
      }}>
        {[
          ['2 min', 'to set up'],
          ['24h', 'check-in window'],
          ['Automatic', 'email alerts'],
          ['100%', 'free to start'],
        ].map(([n, l]) => (
          <div key={n} style={{
            padding: '28px 40px', textAlign: 'center',
            borderRight: '1px solid #f3f4f6'
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{n}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '72px 24px', maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
          How it works
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['1', '👤', 'Create your account', 'Sign up in 2 minutes with just your email and password. No personal details needed.'],
            ['2', '📬', 'Add an emergency contact', 'Enter the email of someone you trust — a family member, friend, or neighbour.'],
            ['3', '✅', 'Check in daily', 'Open the app once a day and press "I\'m Okay". The timer resets and your contact is reassured.'],
            ['4', '⚠️', 'Miss it, they\'re notified', 'If 24 hours pass without a check-in, your emergency contact automatically receives an email alert.'],
          ].map(([num, emoji, title, desc]) => (
            <div key={num} style={{ display: 'flex', gap: 20, padding: '24px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#f0fdf4',
                border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, flexShrink: 0, marginTop: 2
              }}>{emoji}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111827' }}>{title}</div>
                <div style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '72px 24px', background: '#f9fafb' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>
          Simple pricing
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 48, fontSize: 16 }}>
          Start free. Upgrade when you need more.
        </p>
        <div style={{
          display: 'flex', gap: 20, maxWidth: 680, margin: '0 auto',
          flexWrap: 'wrap', justifyContent: 'center'
        }}>
          {/* Free */}
          <div style={{
            flex: 1, minWidth: 260, background: 'white', border: '1px solid #e5e7eb',
            borderRadius: 16, padding: 28
          }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Free</div>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>forever</div>
            {['1 emergency contact', '24h check-in window', 'Email alert on miss', 'Works on any device'].map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: '#374151' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <button onClick={() => { setShowAuth(true); setIsSignUp(true) }} style={{
              width: '100%', marginTop: 24, padding: '11px', fontSize: 14, fontWeight: 600,
              background: 'white', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer'
            }}>Get started free</button>
          </div>

          {/* Pro */}
          <div style={{
            flex: 1, minWidth: 260, background: 'white', border: '2px solid #16a34a',
            borderRadius: 16, padding: 28, position: 'relative'
          }}>
            <div style={{
              position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
              background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 700,
              padding: '4px 14px', borderRadius: 20
            }}>COMING SOON</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Pro</div>
            <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>$5</div>
            <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>per month</div>
            {['Multiple emergency contacts', 'Custom check-in timers', 'Repeated alert attempts', 'Check-in history', 'Lifeline link to another user'].map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: '#374151' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <button disabled style={{
              width: '100%', marginTop: 24, padding: '11px', fontSize: 14, fontWeight: 600,
              background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8,
              cursor: 'not-allowed', color: '#9ca3af'
            }}>Coming soon</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        textAlign: 'center', padding: '32px 24px',
        fontSize: 13, color: '#9ca3af', borderTop: '1px solid #f3f4f6'
      }}>
        🛡️ Lil Lifeline — a simple safety net for people living alone.
      </footer>

      {/* AUTH MODAL */}
      {showAuth && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={e => { if (e.target === e.currentTarget) setShowAuth(false) }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 32,
            width: '100%', maxWidth: 400
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
              {isSignUp ? 'Takes about 2 minutes.' : 'Sign in to your account.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                style={{
                  padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db',
                  borderRadius: 8, outline: 'none', fontFamily: 'inherit'
                }} />
              <input type="password" placeholder="Password (min 6 characters)" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                style={{
                  padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db',
                  borderRadius: 8, outline: 'none', fontFamily: 'inherit'
                }} />
              <button onClick={handleAuth} disabled={loading} style={{
                padding: '12px', fontSize: 15, fontWeight: 700,
                background: loading ? '#86efac' : '#16a34a', color: 'white',
                border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4
              }}>
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
              {message && (
                <p style={{
                  fontSize: 13, textAlign: 'center', padding: 8, borderRadius: 6,
                  color: isError ? '#dc2626' : '#16a34a',
                  background: isError ? '#fef2f2' : '#f0fdf4'
                }}>{message}</p>
              )}
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button onClick={() => { setIsSignUp(!isSignUp); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#16a34a', fontSize: 14, fontFamily: 'inherit'
              }}>
                {isSignUp ? 'Already have an account? Sign in →' : "Don't have an account? Sign up free →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}