'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeProvider'
import { Vote, Building2, LogOut, Sun, Moon, LayoutGrid, X } from 'lucide-react'

type NavItem = { href: string; icon: any; label: string }
const navItems: NavItem[] = [
  { href: '/asambleas', icon: Vote, label: 'Asambleas' },
  { href: '/asambleas/edificios', icon: Building2, label: 'Edificios y unidades' },
]
const bottomNavItems: NavItem[] = [
  { href: '/hub',       icon: LayoutGrid, label: 'Portal' },
  { href: '/asambleas', icon: Vote,       label: 'Asambleas' },
  { href: '/asambleas/edificios', icon: Building2, label: 'Edificios' },
]

function activo(pathname: string, href: string) {
  if (href === '/asambleas') return pathname.startsWith('/asambleas') && !pathname.startsWith('/asambleas/edificios')
  return pathname.startsWith(href)
}

export default function AsambleasSidebar() {
  const pathname = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <div className="mobile-topbar">
        <img src="/logo-fascioli.svg" alt="Fascioli Asambleas" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme} aria-label="Cambiar tema"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', padding: 4 }}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menú">
            {open ? <X size={16} color="var(--gold)" /> : <><span /><span /><span /></>}
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <nav className="bottom-nav">
        {bottomNavItems.map(item => (
          <Link key={item.href} href={item.href} className={`bottom-nav-item ${activo(pathname, item.href) ? 'active' : ''}`}>
            <item.icon size={19} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'space-between', padding: '20px 16px' }}>
          <img src="/logo-fascioli.svg" alt="Fascioli Asambleas" style={{ width: '100%', maxWidth: 150, height: 'auto', display: 'block' }} />
          <button onClick={toggleTheme} aria-label="Cambiar tema" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            style={{ background: 'rgba(201,168,76,.1)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7, flexShrink: 0 }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <Link href="/hub" className="nav-item" style={{ borderBottom: '1px solid rgba(255,255,255,.07)', paddingBottom: 12, marginBottom: 12 }}>
            <LayoutGrid size={16} />
            Inicio · Portal
          </Link>
          <div className="nav-section">Asambleas</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${activo(pathname, item.href) ? 'active' : ''}`}>
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button onClick={handleLogout} className="nav-item" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B8C5D6', width: '100%' }}>
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
