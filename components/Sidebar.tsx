'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, AlertTriangle, FolderOpen, Settings, LogOut, Shield
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos' },
  { href: '/vencimientos', icon: Bell,            label: 'Vencimientos' },
  { href: '/siniestros',   icon: AlertTriangle,   label: 'Siniestros' },
  { href: '/documentos',   icon: FolderOpen,      label: 'Documentos' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🛡️</div>
        <div className="logo-text">
          <div className="brand">Fascioli</div>
          <div className="sub">Seguros</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 0' }}>
        <div className="nav-section">Menú</div>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        ))}
        <div className="nav-section" style={{ marginTop: '10px' }}>Sistema</div>
        <Link href="/configuracion" className={`nav-item ${pathname.startsWith('/configuracion') ? 'active' : ''}`}>
          <Settings size={17} />
          Configuración
        </Link>
      </nav>

      <div style={{ padding: '12px 8px 20px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-light)' }}
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
