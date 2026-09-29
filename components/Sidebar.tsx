'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { EVENTO_CUOTAS } from '@/lib/cuotasEvento'
import { hoyLocal } from '@/lib/obrasConfig'
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

const DIAS_AVISO_CUOTAS = 5
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
  const [urgent, setUrgent] = useState({ vencidas: 0, proximas: 0 })
  const urgentCount = urgent.vencidas + urgent.proximas
  const urgentColor = urgent.vencidas > 0 ? '#DC2626' : '#D97706'
  const urgentTitle = [urgent.vencidas && `${urgent.vencidas} vencida${urgent.vencidas > 1 ? 's' : ''} sin cobrar`, urgent.proximas && `${urgent.proximas} vence${urgent.proximas > 1 ? 'n' : ''} en los próximos ${DIAS_AVISO_CUOTAS} días`].filter(Boolean).join(' · ')

  useEffect(() => { fetchStorageUsage() }, [])
  useEffect(() => { setOpen(false); fetchUrgentCuotas() }, [pathname])
  useEffect(() => {
    const refrescar = () => fetchUrgentCuotas()
    const alVolver = () => { if (document.visibilityState === 'visible') fetchUrgentCuotas() }
    window.addEventListener(EVENTO_CUOTAS, refrescar)
    document.addEventListener('visibilitychange', alVolver)
    return () => { window.removeEventListener(EVENTO_CUOTAS, refrescar); document.removeEventListener('visibilitychange', alVolver) }
  }, [])

  // Numerito de "Pagos y cuotas": cuotas sin cobrar ya vencidas + las que vencen en los próximos 5 días.
  // Se recalcula al cambiar de pantalla, al volver a la pestaña y apenas se cobra / deshace una cuota.
  async function fetchUrgentCuotas() {
    try {
      const hoyISO = hoyLocal()
      const [hy, hm, hd] = hoyISO.split('-').map(Number)
      const hoy = new Date(hy, hm - 1, hd)
      const limite = new Date(hoy); limite.setDate(limite.getDate() + DIAS_AVISO_CUOTAS)
      const [{ data: polizas }, { data: pagos }] = await Promise.all([
        supabase.from('polizas').select('id, cuotas, cuota_mes'),
        supabase.from('pagos').select('poliza_id, cuota_num'),
      ])
      if (!polizas) return
      const pagosSet = new Set((pagos || []).map((pg: any) => `${pg.poliza_id}-${pg.cuota_num}`))
      const meses: Record<string,number> = { Ene:1,Feb:2,Mar:3,Abr:4,May:5,Jun:6,Jul:7,Ago:8,Sep:9,Oct:10,Nov:11,Dic:12 }
      let vencidas = 0, proximas = 0
      for (const pol of polizas) {
        if (!pol.cuota_mes) continue
        const items = pol.cuota_mes.split(' - ')
        for (let n = 1; n <= (pol.cuotas || 0); n++) {
          if (pagosSet.has(`${pol.id}-${n}`)) continue
          const item = items[n-1]; if (!item) continue
          const parts = item.split('/')
          if (parts.length < 4) continue
          const d = parseInt(parts[1]), m = meses[parts[2]] || 1, y = 2000 + parseInt(parts[3])
          const fecha = new Date(y, m-1, d)
          if (fecha < hoy) vencidas++
          else if (fecha <= limite) proximas++
        }
      }
      setUrgent({ vencidas, proximas })
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
                <span title={urgentTitle} style={{ position: 'absolute', top: -4, right: -6, background: urgentColor, color: 'white', borderRadius: 8, fontSize: 9, fontWeight: 800, padding: '0 4px', minWidth: 14, textAlign: 'center', lineHeight: '14px' }}>
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
                <span title={urgentTitle} style={{ marginLeft: 'auto', background: urgentColor, color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
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



