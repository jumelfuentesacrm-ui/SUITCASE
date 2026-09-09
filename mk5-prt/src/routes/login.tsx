import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { business } from "@/config/business.config";

export const Route = createFileRoute('/login')({
  component: Login,
})

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setError('Credenciales incorrectas')
      setLoading(false)
      return
    }
    // Verify profile exists — role is resolved in admin.tsx
    const { error: profileErr } = await supabase.from('profiles').select('id').eq('id', data.user.id).single()
    if (profileErr) {
      setError('Tu cuenta no tiene perfil asignado. Contacta al administrador.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }
    navigate({ to: '/admin' })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg,#feeff2 0%,#fbe0e8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,168,198,0.25)',
        borderRadius: 24,
        padding: '40px 32px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 4px 32px rgba(42,26,32,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 22, fontWeight: 400, color: '#2a1a20', margin: 0, letterSpacing: '0.04em' }}>
            {business.shortName} <span style={{ color: '#ffa8c6' }}>{business.tagline}</span>
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '4px', color: '#d9b850', marginTop: 6, textTransform: 'uppercase' }}>Panel de administración</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8a7080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Cinzel', serif" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 10, border: '1.5px solid rgba(255,168,198,0.35)', background: 'rgba(255,255,255,0.85)', fontSize: 14, color: '#2a1a20', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8a7080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'Cinzel', serif" }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 10, border: '1.5px solid rgba(255,168,198,0.35)', background: 'rgba(255,255,255,0.85)', fontSize: 14, color: '#2a1a20', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#c0392b', textAlign: 'center', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '14px', borderRadius: 10, background: '#ffa8c6', color: '#2a1a20', fontWeight: 700, fontSize: 11, letterSpacing: '3px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'Cinzel', serif", marginTop: 4, textTransform: 'uppercase' }}
          >
            {loading ? 'Entrando...' : 'Entrar al panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
