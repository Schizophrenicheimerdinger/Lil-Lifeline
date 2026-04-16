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
    if (!email || !password) { setMessage('Please enter your email and password.'); setIsError(true); return }
    if (password.length < 6) { setMessage('Password must be at least 6 characters.'); setIsError(true); return }
    setLoading(true); setMessage(''); setIsError(false)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setMessage(error.message); setIsError(true) }
      else { setMessage('✅ Account created! Check your email to confirm, then sign in.'); setIsError(false); setIsSignUp(false) }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMessage(error.message); setIsError(true) }
      else { router.push('/dashboard') }
    }
    setLoading(false)
  }

  const inputStyle = {
    padding: '11px 14px', fontSize: 15, border: '1px solid #333',
    borderRadius: 8, outline: 'none', fontFamily: 'inherit',
    background: '#1a1a1a', color: 'white', width: '100%',
  }

  return (
    <main style={{ background: '#0a0a0a', color: 'white', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 32px', borderBottom: '1px solid #1f1f1f',
        background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
          Lil Lifeline
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setShowAuth(true); setIsSignUp(false) }} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid #333',
            background: 'transparent', cursor: 'pointer', fontSize: 14,
            fontWeight: 500, color: '#ccc', fontFamily: 'inherit'
          }}>Sign in</button>
          <button onClick={() => { setShowAuth(true); setIsSignUp(true) }} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid #16a34a',
            background: 'transparent', color: '#4ade80', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 0 12px rgba(74,222,128,0.2)'
          }}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow blobs */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(74,222,128,0.07) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'inline-block', background: 'rgba(74,222,128,0.1)',
          color: '#4ade80', fontSize: 12, fontWeight: 600, padding: '6px 14px',
          borderRadius: 20, marginBottom: 28, letterSpacing: '0.08em',
          border: '1px solid rgba(74,222,128,0.2)', textTransform: 'uppercase'
        }}>
          A quiet safety net
        </div>

        <h1 style={{
          fontSize: 'clamp(42px, 8vw, 80px)', fontWeight: 900,
          lineHeight: 1.08, margin: '0 auto 28px', maxWidth: 700,
          letterSpacing: '-2px',
          background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.15))'
        }}>
          One button<br />to say you're okay.
        </h1>

        <p style={{
          fontSize: 18, color: '#888', maxWidth: 460,
          margin: '0 auto 40px', lineHeight: 1.75
        }}>
          Check in once a day — miss it, and your trusted contacts are automatically notified. For you and everyone you care about.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setShowAuth(true); setIsSignUp(true) }} style={{
            padding: '15px 36px', fontSize: 16, fontWeight: 700,
            background: 'transparent', color: '#4ade80',
            border: '1px solid #16a34a', borderRadius: 10, cursor: 'pointer',
            boxShadow: '0 0 24px rgba(74,222,128,0.25), inset 0 0 24px rgba(74,222,128,0.05)',
            fontFamily: 'inherit', letterSpacing: '-0.2px'
          }}>
            Get started — it's free
          </button>
          <button onClick={() => { setShowAuth(true); setIsSignUp(false) }} style={{
            padding: '15px 36px', fontSize: 16, fontWeight: 600,
            background: 'transparent', color: '#666', border: '1px solid #2a2a2a',
            borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Sign in
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#444', marginTop: 20 }}>
          No app download needed · Works on any phone · Free forever
        </p>
      </section>

      {/* STATS */}
      <section style={{
        display: 'flex', justifyContent: 'center',
        borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a',
        flexWrap: 'wrap'
      }}>
        {[['2 min', 'to set up'], ['24h', 'check-in window'], ['Automatic', 'email alerts'], ['100%', 'free to start']].map(([n, l]) => (
          <div key={n} style={{
            padding: '28px 44px', textAlign: 'center', borderRight: '1px solid #1a1a1a'
          }}>
            <div style={{
              fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-0.5px',
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'
            }}>{n}</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 24px', maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 56,
          letterSpacing: '-1px',
          background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.6) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.1))'
        }}>
          How it works
        </h2>
        {[
          ['👤', 'Create your account', 'Sign up in 2 minutes with just your email and password.'],
          ['📬', 'Add an emergency contact', 'Enter the email of someone you trust — a family member, friend, or neighbour.'],
          ['✅', 'Check in daily', 'Open the app once a day and press "I\'m Okay". Simple as that.'],
          ['⚠️', 'Miss it, they\'re notified', 'If 24 hours pass without a check-in, your contacts automatically receive an email alert.'],
        ].map(([emoji, title, desc], i) => (
          <div key={i} style={{
            display: 'flex', gap: 20, padding: '24px 0',
            borderBottom: '1px solid #1a1a1a'
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0
            }}>{emoji}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'white' }}>{title}</div>
              <div style={{ fontSize: 15, color: '#666', lineHeight: 1.65 }}>{desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* PRICING */}
      <section style={{ padding: '80px 24px', background: '#050505' }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 12,
          letterSpacing: '-1px',
          background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.6) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.1))'
        }}>Simple pricing</h2>
        <p style={{ textAlign: 'center', color: '#555', marginBottom: 52, fontSize: 16 }}>
          Start free. Upgrade when you need more.
        </p>

        <div style={{ display: 'flex', gap: 20, maxWidth: 960, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* Free */}
          <div style={{
            flex: 1, minWidth: 220, background: '#111', border: '1px solid #222',
            borderRadius: 16, padding: 28
          }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Free</div>
            <div style={{ fontSize: 38, fontWeight: 900, marginBottom: 2, color: 'white', letterSpacing: '-2px' }}>$0</div>
            <div style={{ fontSize: 13, color: '#444', marginBottom: 20 }}>forever</div>
            {[
              '1 emergency contact',
              '24h check-in window',
              'Email alert on miss',
              'Works on any device',
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 9, fontSize: 13, color: '#777' }}>
                <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {f}
              </div>
            ))}
            <button onClick={() => { setShowAuth(true); setIsSignUp(true) }} style={{
              width: '100%', marginTop: 22, padding: 11, fontSize: 14, fontWeight: 600,
              background: 'transparent', border: '1px solid #333', borderRadius: 8,
              cursor: 'pointer', color: '#ccc', fontFamily: 'inherit'
            }}>Get started free</button>
          </div>

          {/* Pro */}
          <div style={{
            flex: 1, minWidth: 220, background: '#111',
            border: '1px solid rgba(74,222,128,0.35)', borderRadius: 16, padding: 28,
            position: 'relative', boxShadow: '0 0 30px rgba(74,222,128,0.08)'
          }}>
            <div style={{
              position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
              background: '#16a34a', color: 'white', fontSize: 11, fontWeight: 700,
              padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.06em'
            }}>MOST POPULAR</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pro</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: 'white', letterSpacing: '-2px' }}>$2.99</div>
              <div style={{ fontSize: 13, color: '#444' }}>/month</div>
            </div>
            <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 20 }}>or $24.99/year — save $11</div>
            {[
              'Everything in Free',
              'Up to 5 emergency contacts',
              'Custom check-in timers (12h–72h)',
              'Repeated alert attempts',
              'Check-in history',
              'Lifeline link to another user',
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 9, fontSize: 13, color: '#777' }}>
                <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {f}
              </div>
            ))}
            <button disabled style={{
              width: '100%', marginTop: 22, padding: 11, fontSize: 14, fontWeight: 600,
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: 8, cursor: 'not-allowed', color: '#4ade80',
              fontFamily: 'inherit'
            }}>Coming soon</button>
          </div>

          {/* Family */}
          <div style={{
            flex: 1, minWidth: 220, background: '#111', border: '1px solid #2a2a2a',
            borderRadius: 16, padding: 28, position: 'relative'
          }}>
            <div style={{
              position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
              background: '#1d4ed8', color: 'white', fontSize: 11, fontWeight: 700,
              padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.06em'
            }}>BEST VALUE</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Family</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: 'white', letterSpacing: '-2px' }}>$7.99</div>
              <div style={{ fontSize: 13, color: '#444' }}>/month</div>
            </div>
            <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 20 }}>Up to 5 members · $1.60 per person</div>
            {[
              'Everything in Pro',
              '5 member accounts',
              'Shared family dashboard',
              'See all members\' check-in status',
              'Group alert — notify whole family',
              'One simple bill',
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 9, fontSize: 13, color: '#777' }}>
                <span style={{ color: '#60a5fa', flexShrink: 0 }}>✓</span> {f}
              </div>
            ))}
            <button disabled style={{
              width: '100%', marginTop: 22, padding: 11, fontSize: 14, fontWeight: 600,
              background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
              borderRadius: 8, cursor: 'not-allowed', color: '#60a5fa',
              fontFamily: 'inherit'
            }}>Coming soon</button>
          </div>

        </div>

        {/* Value callout */}
        <div style={{
          maxWidth: 480, margin: '40px auto 0', textAlign: 'center',
          padding: '20px 24px', background: '#0f0f0f',
          border: '1px solid #1f1f1f', borderRadius: 12
        }}>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
            💡 <span style={{ color: '#777' }}>At $2.99/month, Pro costs less than a coffee. The Family plan works out to just <strong style={{ color: '#60a5fa' }}>$1.60 per person</strong> — cheaper than any competitor.</span>
          </div>
        </div>
      </section>
      {/* AUTH MODAL */}
      {showAuth && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: 20
        }} onClick={e => { if (e.target === e.currentTarget) setShowAuth(false) }}>
          <div style={{
            background: '#111', border: '1px solid #222', borderRadius: 16,
            padding: 32, width: '100%', maxWidth: 400
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'white' }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
              {isSignUp ? 'Takes about 2 minutes.' : 'Sign in to your account.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                style={inputStyle} />
              <input type="password" placeholder="Password (min 6 characters)" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                style={inputStyle} />
              <button onClick={handleAuth} disabled={loading} style={{
                padding: 12, fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                background: 'transparent', color: '#4ade80', border: '1px solid #16a34a',
                borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
                boxShadow: loading ? 'none' : '0 0 20px rgba(74,222,128,0.2)'
              }}>
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
              {message && (
                <p style={{
                  fontSize: 13, textAlign: 'center', padding: 8, borderRadius: 6,
                  color: isError ? '#f87171' : '#4ade80',
                  background: isError ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)'
                }}>{message}</p>
              )}
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button onClick={() => { setIsSignUp(!isSignUp); setMessage('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4ade80', fontSize: 14, fontFamily: 'inherit'
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