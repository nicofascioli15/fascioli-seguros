'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router   = useRouter()
  const supabase = createClient()

  // En iPad/iPhone el autocompletado (llavero) llena los campos sin avisarle a la página:
  // por eso se leen directo del formulario al tocar Ingresar.
  async function handleLogin(ev?: React.FormEvent<HTMLFormElement>) {
    ev?.preventDefault()
    const form = ev?.currentTarget
    const em = ((form?.elements.namedItem('email') as HTMLInputElement | null)?.value || email).trim()
    const pw = (form?.elements.namedItem('password') as HTMLInputElement | null)?.value || password
    if (!em || !pw) { setError('Completá el email y la contraseña.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      router.push('/hub')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgb(27,67,95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo + título */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            background: 'rgba(255,255,255,.08)',
            borderRadius: 18,
            padding: '24px 36px',
            display: 'inline-block',
            marginBottom: 20,
            border: '1px solid rgba(255,255,255,.12)'
          }}>
            <img src="/logo-fascioli.svg" alt="Fascioli" style={{ height: 64, display: 'block' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '.02em' }}>
            Control Seguros
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>
            Sistema interno de gestión
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} method="post" action="/api/login" style={{
          background: 'white',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,.35)'
        }}>

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', marginBottom: 8 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
              <input
                type="email"
                name="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="usuario@fascioli.com.uy"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px 12px 42px',
                  border: '1.5px solid var(--border)', borderRadius: 10,
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  color: 'var(--navy)', background: 'white',
                  transition: 'border-color .15s', boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', marginBottom: 8 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px 44px 12px 42px',
                  border: '1.5px solid var(--border)', borderRadius: 10,
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  color: 'var(--navy)', background: 'white',
                  transition: 'border-color .15s', boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--slate)', padding: 4, display: 'flex', alignItems: 'center'
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEE2E2', color: '#991B1B',
              padding: '10px 14px', borderRadius: 9,
              fontSize: 13, marginBottom: 18,
              borderLeft: '3px solid #D94F4F'
            }}>
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', touchAction: 'manipulation',
              background: 'var(--gold)',
              color: 'var(--navy)', fontWeight: 800, fontSize: 15,
              border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .15s', fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
          Fascioli Administraciones © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}


