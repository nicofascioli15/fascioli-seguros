'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeProvider'
import { fetchCategorias, CategoriaRow } from '@/lib/contratosConfig'
import {
  LayoutDashboard, Building2, FileText, Settings, LogOut, Sun, Moon, LayoutGrid, X, AlertTriangle
} from 'lucide-react'

export default function ContratosSidebar() {
  const pathname = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { theme, toggleTheme } = useTheme()

  const [open, setOpen] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaRow[]>([])

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => { fetchCategorias(supabase).then(setCategorias) }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/contratos', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/contratos/edificios', icon: Building2, label: 'Edificios' },
    { href: '/contratos/vencimientos', icon: AlertTriangle, label: 'Vencimientos' },
    ...categorias.map(c => ({ href: `/contratos/categoria/${c.slug}`, icon: FileText, label: c.label })),
  ]

  const bottomNavItems = [
    { href: '/contratos', icon: LayoutDashboard, label: 'Inicio' },
    { href: '/contratos/edificios', icon: Building2, label: 'Edificios' },
    ...categorias.slice(0, 2).map(c => ({ href: `/contratos/categoria/${c.slug}`, icon: FileText, label: c.label })),
  ]

  return (
    <>
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <img src="/logo-fascioli.svg" alt="Fascioli Contratos" />
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
            className={`bottom-nav-item ${item.href === '/contratos' ? pathname === item.href ? 'active' : '' : pathname.startsWith(item.href) ? 'active' : ''}`}>
            <item.icon size={19} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'space-between', padding: '20px 16px' }}>
          <img src="/logo-fascioli.svg" alt="Fascioli Contratos"
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
          <div className="nav-section">Contratos</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item ${item.href === '/contratos' ? pathname === item.href ? 'active' : '' : pathname.startsWith(item.href) ? 'active' : ''}`}>
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
          <div className="nav-section" style={{ marginTop: 10 }}>Sistema</div>
          <Link href="/contratos/configuracion"
            className={`nav-item ${pathname.startsWith('/contratos/configuracion') ? 'active' : ''}`}>
            <Settings size={17} />
            Configuración
          </Link>
        </nav>

        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button onClick={handleLogout} className="nav-item"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B8C5D6', width: '100%' }}>
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
