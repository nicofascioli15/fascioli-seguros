'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '48px 40px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'rgb(27,67,95)', borderRadius: 14,
            padding: '16px 24px', display: 'inline-block', marginBottom: 16
          }}>
            <img src="/logo-fascioli.svg" alt="Fascioli Seguros" style={{ height: 48, display: 'block' }} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--slate)' }}>
            Acceso al sistema interno
          </div>
        </div>

        {/* Form */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="usuario@fascioli.com.uy"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ paddingRight: '40px' }}
            />
            <button
              onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: '4px'
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FDEAEA', color: '#B03030', padding: '10px 14px',
            borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  )
}

