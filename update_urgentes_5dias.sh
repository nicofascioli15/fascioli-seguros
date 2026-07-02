#!/bin/bash
set -e
mkdir -p 'app/(app)/dashboard' components
cat > 'app/(app)/dashboard/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, FileText, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function parseFechaCuota(cuotaMes: string | null, n: number): string | null {
  if (!cuotaMes) return null
  const items = cuotaMes.split(' - ')
  const item = items[n - 1]
  if (!item) return null
  const parts = item.split('/')
  if (parts.length < 4) return null
  const meses: Record<string,string> = { Ene:'01',Feb:'02',Mar:'03',Abr:'04',May:'05',Jun:'06',Jul:'07',Ago:'08',Sep:'09',Oct:'10',Nov:'11',Dic:'12' }
  const d = parts[1].padStart(2,'0'), m = meses[parts[2]] || '01', y = `20${parts[3]}`
  return `${y}-${m}-${d}`
}

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ venc30: 0, venc7: 0, siniestros: 0 })
  const [loading, setLoading] = useState(true)
  const [vencProximas, setVencProximas] = useState<any[]>([])
  const [cuotasProximas, setCuotasProximas] = useState<any[]>([])
  const [cuotasUrgentes, setCuotasUrgentes]   = useState<any[]>([])

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const [{ data: polizasData }, { count: siniestros }, { data: pagosData }] = await Promise.all([
      supabase.from('polizas').select('id, numero, ramo, vencimiento, cuotas, cuota_mes, clientes(nombre, id)'),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).neq('estado', 'Cerrado'),
      supabase.from('pagos').select('poliza_id, cuota_num'),
    ])
    const venc30 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 30 }).length
    const proximas = (polizasData || [])
      .filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 90 })
      .sort((a, b) => (diasHasta(a.vencimiento) || 0) - (diasHasta(b.vencimiento) || 0))
      .slice(0, 6)
    const venc7 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 7 }).length
    // Build proximas cuotas pendientes
    const pagosSet = new Set((pagosData || []).map((pg: any) => `${pg.poliza_id}-${pg.cuota_num}`))
    const cuotaRows: any[] = []
    for (const pol of polizasData || []) {
      if (!pol.cuota_mes || !pol.cuotas) continue
      for (let n = 1; n <= pol.cuotas; n++) {
        if (pagosSet.has(`${pol.id}-${n}`)) continue
        const fecha = parseFechaCuota(pol.cuota_mes, n)
        if (!fecha) continue
        const d = diasHasta(fecha)
        if (d !== null && d >= 0 && d <= 90) {
          cuotaRows.push({ poliza_id: pol.id, numero: pol.numero, cuota_num: n, ramo: pol.ramo, cliente: (pol.clientes as any)?.nombre, fecha, dias: d })
        }
      }
    }
    cuotaRows.sort((a, b) => a.dias - b.dias)
    setCuotasUrgentes(cuotaRows.filter(c => c.dias <= 5))
    setCuotasProximas(cuotaRows.slice(0, 6))
    setStats({ venc30, venc7, siniestros: siniestros || 0 })
    setVencProximas(proximas)
    setLoading(false)
  }

  function formatFecha(iso: string | null) {
    if (!iso) return '—'
    const [y,m,d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const statCards: { label: string; value: any; sub: string; icon: any; bg: string; iconColor: string; href?: string }[] = [
    { label: 'Vencen en 30 días',   value: loading ? '—' : stats.venc30,     sub: 'Ver vencimientos →', icon: Bell,          bg: '#FEF3C7', iconColor: '#D97706', href: '/vencimientos' },
    { label: 'Siniestros abiertos', value: loading ? '—' : stats.siniestros, sub: 'En gestión',         icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F', href: '/siniestros' },
  ]

  return (
    <div>
      {/* Banner urgente */}
      {!loading && stats.venc7 > 0 && (
        <a href="/vencimientos" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 12, padding: '13px 18px', marginBottom: 16, cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
          onMouseLeave={e => (e.currentTarget.style.background = '#FEF2F2')}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={18} color="#D94F4F" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#991B1B' }}>
              {stats.venc7 === 1 ? '1 póliza vence' : `${stats.venc7} pólizas vencen`} en los próximos 7 días
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
              Tocá para ver los vencimientos urgentes →
            </div>
          </div>
        </a>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          {new Date().toLocaleDateString('es-UY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats — CSS class handles responsive */}
      <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {statCards.map(s => (
          s.href ? (
            <a key={s.label} href={s.href} className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="stat-card-inner">
                <div className="stat-card-text">
                  <div className="label">{s.label}</div>
                  <div className="value">{s.value}</div>
                  <div className="sub">{s.sub}</div>
                </div>
                <div className="stat-card-icon" style={{ background: s.bg }}>
                  <s.icon size={20} color={s.iconColor} />
                </div>
              </div>
            </a>
          ) : (
            <div key={s.label} className="stat-card">
              <div className="stat-card-inner">
                <div className="stat-card-text">
                  <div className="label">{s.label}</div>
                  <div className="value">{s.value}</div>
                  <div className="sub">{s.sub}</div>
                </div>
                <div className="stat-card-icon" style={{ background: s.bg }}>
                  <s.icon size={20} color={s.iconColor} />
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Panels — CSS class handles responsive */}
      <div className="dashboard-panels" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {/* Próximos vencimientos pólizas */}
        <div className="dashboard-panel">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Vencim. de pólizas</div>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : vencProximas.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay vencimientos próximos</div>
          ) : vencProximas.map(p => {
            const d = diasHasta(p.vencimiento)
            const cls = d !== null && d <= 7 ? 'badge-danger' : d !== null && d <= 30 ? 'badge-warning' : 'badge-success'
            return (
              <a key={p.id} href={`/polizas?open=${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-soft)', overflow: 'hidden', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{p.ramo}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{(p.clientes as any)?.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Póliza {p.numero}</div>
                </div>
                <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{d}d</span>
              </a>
            )
          })}
          {vencProximas.length > 0 && (
            <a href="/vencimientos" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
          )}
        </div>

        {/* Próximas cuotas a vencer */}
        <div className="dashboard-panel">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Vencim. de cuotas</div>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : cuotasProximas.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay cuotas próximas a vencer</div>
          ) : cuotasProximas.map((c, i) => {
            const cls = c.dias <= 7 ? 'badge-danger' : c.dias <= 30 ? 'badge-warning' : 'badge-success'
            return (
              <a key={i} href={`/polizas?open=${c.poliza_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-soft)', overflow: 'hidden', textDecoration: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{c.ramo}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                    {c.cliente} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>· Cuota {c.cuota_num}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Póliza {c.numero}</div>
                </div>
                <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{c.dias}d</span>
              </a>
            )
          })}
          {cuotasProximas.length > 0 && (
            <a href="/pagos" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="dashboard-panel">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Accesos rápidos</div>
          {[
            { href: '/clientes',     Icon: Users,         label: 'Nuevo cliente',    sub: 'Agregar un cliente a la cartera' },
            { href: '/polizas',      Icon: FileText,      label: 'Nueva póliza',     sub: 'Cargar una póliza existente' },
            { href: '/vencimientos', Icon: Bell,          label: 'Ver vencimientos', sub: 'Pólizas próximas a vencer' },
            { href: '/siniestros',   Icon: AlertTriangle, label: 'Nuevo siniestro',  sub: 'Registrar un siniestro' },
          ].map(({ href, Icon, label, sub }) => (
            <a key={href} href={href} className="acceso-rapido">
              <div className="acceso-rapido-icon">
                <Icon size={17} color="var(--navy)" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/dashboard/page.tsx'

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
  Bell, AlertTriangle, FolderOpen, Settings, LogOut, Menu, X, History, UserCog, Sun, Moon
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
git commit -m 'fix alerta cuotas urgentes a 5 dias'
git push
