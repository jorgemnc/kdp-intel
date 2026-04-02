'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 8 }}>
            KDP INTELLIGENCE SYSTEM
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            TEORÍA DE JUEGOS
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
            <span style={{ background: '#1a2a1a', color: 'var(--accent-green)', border: '1px solid #1e3a1e' }} className="pill">🇪🇸 ES</span>
            <span style={{ background: '#1a1f2a', color: 'var(--accent)', border: '1px solid #1e2a3a' }} className="pill">🇺🇸 COM</span>
          </div>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.1em' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                }}
                placeholder="jorge@example.com"
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.1em' }}>
                CONTRASEÑA
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                }}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#1a0a0e', border: '1px solid #3a1020', borderRadius: 6, color: 'var(--accent-red)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', background: 'var(--accent)', border: 'none',
                borderRadius: 6, color: '#000', fontSize: 14, fontWeight: 700,
                fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, letterSpacing: '0.02em',
              }}
            >
              {loading ? 'ACCEDIENDO...' : 'ACCEDER'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          STEVE ALLEN · AMAZON KDP
        </div>
      </div>
    </div>
  )
}
