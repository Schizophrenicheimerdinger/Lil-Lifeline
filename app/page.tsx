'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  async function handleAuth() {
    // Basic validation
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
      // Create new account
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
      // Sign in to existing account
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

  // Allow pressing Enter to submit
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAuth()
  }

  return (
    <main style={{
      maxWidth: 400,
      margin: '80px auto',
      padding: '0 20px'
    }}>
      {/* Logo / Title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🛡️</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Lil Lifeline</h1>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.5 }}>
          A simple daily check-in for people living alone.<br />
          Miss it, and your emergency contact is notified.
        </p>
      </div>

      {/* Form card */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 28
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
          {isSignUp ? 'Create your account' : 'Sign in'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          <button
            onClick={handleAuth}
            disabled={loading}
            style={{
              padding: '12px 16px',
              fontSize: 15,
              fontWeight: 600,
              background: loading ? '#86efac' : '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              marginTop: 4
            }}
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          {message && (
            <p style={{
              fontSize: 14,
              textAlign: 'center',
              color: isError ? '#dc2626' : '#16a34a',
              padding: '8px',
              background: isError ? '#fef2f2' : '#f0fdf4',
              borderRadius: 6
            }}>
              {message}
            </p>
          )}
        </div>

        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #f3f4f6',
          textAlign: 'center'
        }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage('')
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#16a34a',
              fontSize: 14,
              fontFamily: 'inherit'
            }}
          >
            {isSignUp
              ? 'Already have an account? Sign in →'
              : "Don't have an account? Sign up free →"}
          </button>
        </div>
      </div>
    </main>
  )
}