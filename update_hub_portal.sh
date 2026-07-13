#!/bin/bash
set -e
mkdir -p app/hub app components
cat > 'app/hub/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAVY = '#0F1E35'
const GOLD = '#C9A84C'

type Module = {
  id: string
  label: string
  description: string
  route: string
  ready: boolean
  accent: string
  icon: React.ReactNode
  stats?: { label: string; value: string | number }[]
}

function IconShield() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function IconWrench() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}
function IconFile() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 22V12h6v10"/>
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1"/>
    </svg>
  )
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

export default function HubPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState('')
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({ polizas: 0, vencen30: 0, pendientes: 0 })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserName(user.email?.split('@')[0] || 'Usuario')

      // Load seguros stats
      const [{ count: polizas }, { data: pagosData }] = await Promise.all([
        supabase.from('polizas').select('*', { count: 'exact', head: true }),
        supabase.from('pagos').select('poliza_id, cuota_num'),
      ])
      const hoy = new Date()
      const en30 = new Date(); en30.setDate(en30.getDate() + 30)
      const { count: vencen30 } = await supabase.from('polizas').select('*', { count: 'exact', head: true })
        .gte('vencimiento', hoy.toISOString().slice(0,10))
        .lte('vencimiento', en30.toISOString().slice(0,10))

      setStats({
        polizas: polizas || 0,
        vencen30: vencen30 || 0,
        pendientes: 0,
      })
      setLoading(false)
    }
    init()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const modules: Module[] = [
    {
      id: 'seguros',
      label: 'Seguros',
      description: 'Pólizas, pagos, vencimientos, siniestros y documentos',
      route: '/dashboard',
      ready: true,
      accent: GOLD,
      icon: <IconShield />,
      stats: [
        { label: 'Pólizas', value: stats.polizas },
        { label: 'Vencen en 30d', value: stats.vencen30 },
      ],
    },
    {
      id: 'mantenimiento',
      label: 'Mantenimiento',
      description: 'Control de extintores, tanques de agua y ensayos',
      route: '/mantenimiento',
      ready: false,
      accent: '#4FBE8C',
      icon: <IconWrench />,
    },
    {
      id: 'contratos',
      label: 'Contratos',
      description: 'Gestión de contratos y proveedores',
      route: '/contratos',
      ready: false,
      accent: '#9D7FD4',
      icon: <IconFile />,
    },
    {
      id: 'edificios',
      label: 'Edificios',
      description: 'Gestión de propiedades y administración',
      route: '/edificios',
      ready: false,
      accent: '#E2A84C',
      icon: <IconBuilding />,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FB', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Topbar */}
      <div style={{ background: NAVY, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-fascioli.svg" alt="Fascioli" style={{ height: 26 }} />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)', margin: '0 4px' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase' }}>Intranet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12.5, color: '#B8C5D6' }}>{userName}</span>
          <button onClick={handleLogout}
            style={{ fontSize: 12, color: '#8A9BB5', background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Salir
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '52px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Portal de gestión
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: NAVY, margin: '0 0 10px', lineHeight: 1.2 }}>
            ¿A qué módulo querés ingresar?
          </h1>
          <p style={{ fontSize: 13.5, color: '#8A9BB5', margin: 0, lineHeight: 1.6 }}>
            Seleccioná el área de trabajo. Cada módulo tiene su propio panel de gestión.
          </p>
        </div>

        {/* Module grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {modules.map(mod => (
            <ModuleCard key={mod.id} mod={mod} loading={loading} onClick={() => { if (mod.ready) router.push(mod.route) }} />
          ))}
        </div>

        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 12, color: '#B8C5D6' }}>
          Fascioli Administraciones · Sistema interno de gestión
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ mod, loading, onClick }: { mod: Module; loading: any; onClick: () => void; key?: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 16,
        border: `2px solid ${hovered && mod.ready ? mod.accent : '#E2E8F0'}`,
        padding: '26px 24px',
        cursor: mod.ready ? 'pointer' : 'default',
        transition: 'all .18s ease',
        boxShadow: hovered && mod.ready ? '0 8px 28px rgba(15,30,53,.1)' : '0 1px 3px rgba(15,30,53,.05)',
        transform: hovered && mod.ready ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 18,
        opacity: mod.ready ? 1 : 0.65,
      }}>

      {/* Icon + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 50, height: 50, borderRadius: 13, background: mod.ready ? NAVY : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: mod.ready ? mod.accent : '#94A3B8', flexShrink: 0 }}>
          {mod.icon}
        </div>
        {!mod.ready && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#94A3B8', background: '#F1F5F9', padding: '3px 9px', borderRadius: 6 }}>
            Próximamente
          </span>
        )}
      </div>

      {/* Text */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 5 }}>{mod.label}</div>
        <div style={{ fontSize: 13, color: '#8A9BB5', lineHeight: 1.5 }}>{mod.description}</div>
      </div>

      {/* Stats */}
      {mod.ready && mod.stats && mod.stats.length > 0 && (
        <div style={{ display: 'flex', gap: 20, borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
          {mod.stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>
                {loading ? '—' : s.value}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {mod.ready && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: hovered ? NAVY : '#94A3B8', transition: 'color .15s' }}>
            Ingresar al módulo
          </span>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: hovered ? NAVY : '#F4F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hovered ? 'white' : '#94A3B8', transition: 'all .15s', flexShrink: 0 }}>
            <IconArrow />
          </div>
        </div>
      )}
    </div>
  )
}

FILEEOF
echo '+ app/hub/page.tsx'

cat > 'app/page.tsx' << 'FILEEOF'
import { redirect } from 'next/navigation'
export default function Home() { redirect('/hub') }


FILEEOF
echo '+ app/page.tsx'

cat > 'app/login/page.tsx' << 'FILEEOF'
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

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
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
        <div style={{
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
                placeholder="usuario@fascioli.com.uy"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
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
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
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
            onClick={handleLogin}
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '13px',
              background: loading || !email || !password ? '#D4A83A' : 'var(--gold)',
              color: 'var(--navy)', fontWeight: 800, fontSize: 15,
              border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .15s', fontFamily: 'inherit',
              opacity: loading || !email || !password ? 0.7 : 1
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
          Fascioli Administraciones © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}


FILEEOF
echo '+ app/login/page.tsx'

cat > 'components/Sidebar.tsx' << 'FILEEOF'
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useTheme } from '@/lib/ThemeProvider'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, AlertTriangle, FolderOpen, Settings, LogOut, Menu, X, History, UserCog, Sun, Moon, LayoutGrid
} from 'lucide-react'

type NavItem = { href: string; icon: any; label: string; urgent?: boolean }
const navItems: NavItem[] = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos y cuotas', urgent: true },
  { href: '/vencimientos', icon: Bell,            label: 'Vencim. pólizas' },
  { href: '/siniestros',   icon: AlertTriangle,   label: 'Siniestros' },
  { href: '/documentos',   icon: FolderOpen,      label: 'Documentos' },
]

const bottomNavItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Inicio' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/vencimientos', icon: Bell,            label: 'Vencim.' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos' },
]

const LIMIT_BYTES = 1 * 1024 * 1024 * 1024

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { esSuperAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [open, setOpen]           = useState(false)
  const [usedBytes, setUsedBytes]   = useState<number | null>(null)
  const [urgentCount, setUrgentCount] = useState(0)

  useEffect(() => { fetchStorageUsage(); fetchUrgentCuotas() }, [])
  useEffect(() => { setOpen(false) }, [pathname])

  async function fetchUrgentCuotas() {
    try {
      const hoy = new Date(); hoy.setHours(0,0,0,0)
      const en2dias = new Date(hoy); en2dias.setDate(en2dias.getDate() + 5)
      const { data: polizas } = await supabase.from('polizas').select('id, cuotas, cuota_mes')
      const { data: pagos } = await supabase.from('pagos').select('poliza_id, cuota_num')
      if (!polizas) return
      const pagosSet = new Set((pagos || []).map((pg: any) => `${pg.poliza_id}-${pg.cuota_num}`))
      const meses: Record<string,number> = { Ene:1,Feb:2,Mar:3,Abr:4,May:5,Jun:6,Jul:7,Ago:8,Sep:9,Oct:10,Nov:11,Dic:12 }
      let count = 0
      for (const pol of polizas) {
        if (!pol.cuota_mes) continue
        const items = pol.cuota_mes.split(' - ')
        for (let n = 1; n <= pol.cuotas; n++) {
          if (pagosSet.has(`${pol.id}-${n}`)) continue
          const item = items[n-1]; if (!item) continue
          const parts = item.split('/')
          if (parts.length < 4) continue
          const d = parseInt(parts[1]), m = meses[parts[2]] || 1, y = 2000 + parseInt(parts[3])
          const fecha = new Date(y, m-1, d)
          if (fecha >= hoy && fecha <= en2dias) count++
        }
      }
      setUrgentCount(count)
    } catch {}
  }

  async function fetchStorageUsage() {
    try {
      const { data } = await supabase.from('documentos').select('tamanio_bytes')
      if (data) setUsedBytes(data.reduce((s, d) => s + (d.tamanio_bytes || 0), 0))
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pct      = usedBytes !== null ? Math.min((usedBytes / LIMIT_BYTES) * 100, 100) : 0
  const barColor = pct > 80 ? '#D94F4F' : pct > 50 ? '#D97706' : '#2E9668'

  return (
    <>
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <img src="/logo-fascioli.svg" alt="Fascioli Seguros" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menú">
            {open ? <X size={16} color="var(--gold)" /> : <><span /><span /><span /></>}
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      {/* Bottom nav fija - solo mobile */}
      <nav className="bottom-nav">
        {bottomNavItems.map(item => (
          <Link key={item.href} href={item.href}
            className={`bottom-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
            <div style={{ position: 'relative' }}>
              <item.icon size={19} />
              {item.href === '/pagos' && urgentCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -6, background: '#DC2626', color: 'white', borderRadius: 8, fontSize: 9, fontWeight: 800, padding: '0 4px', minWidth: 14, textAlign: 'center', lineHeight: '14px' }}>
                  {urgentCount}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'space-between', padding: '20px 16px' }}>
          <img src="/logo-fascioli.svg" alt="Fascioli Seguros"
            style={{ width: '100%', maxWidth: 150, height: 'auto', display: 'block' }} />
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            style={{ background: 'rgba(201,168,76,.1)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7, flexShrink: 0 }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,.2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,.1)')}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <Link href="/hub" className="nav-item" style={{ borderBottom: '1px solid rgba(255,255,255,.07)', paddingBottom: 12, marginBottom: 12 }}>
            <LayoutGrid size={16} />
            Inicio · Portal
          </Link>
          <div className="nav-section">Menú</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
              <item.icon size={17} />
              {item.label}
              {item.urgent && urgentCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#DC2626', color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                  {urgentCount}
                </span>
              )}
            </Link>
          ))}
          <div className="nav-section" style={{ marginTop: 10 }}>Sistema</div>
          <Link href="/configuracion"
            className={`nav-item ${pathname.startsWith('/configuracion') ? 'active' : ''}`}>
            <Settings size={17} />
            Configuración
          </Link>
          {esSuperAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: 10 }}>Super Admin</div>
              <Link href="/usuarios"
                className={`nav-item ${pathname.startsWith('/usuarios') ? 'active' : ''}`}>
                <UserCog size={17} />
                Usuarios
              </Link>
              <Link href="/historial"
                className={`nav-item ${pathname.startsWith('/historial') ? 'active' : ''}`}>
                <History size={17} />
                Historial
              </Link>
            </>
          )}
        </nav>

        <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Almacenamiento
              </span>
              <span style={{ fontSize: 11, color: '#B8C5D6' }}>
                {usedBytes !== null ? `${formatBytes(usedBytes)} / 1 GB` : '...'}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: barColor, transition: 'width .6s ease' }} />
            </div>
            {pct > 80 && (
              <div style={{ fontSize: 10, color: '#D94F4F', marginTop: 4, fontWeight: 600 }}>Espacio casi lleno</div>
            )}
          </div>
          <div style={{ paddingBottom: 16 }}>
            <button onClick={handleLogout} className="nav-item"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B8C5D6', width: '100%' }}>
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}



FILEEOF
echo '+ components/Sidebar.tsx'

git add .
git commit -m 'feat portal hub modulos post-login con boton volver en sidebar'
git push
