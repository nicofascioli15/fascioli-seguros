'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, AlertTriangle, FolderOpen, Settings, LogOut
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

const LIMIT_GB = 1
const LIMIT_BYTES = LIMIT_GB * 1024 * 1024 * 1024

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [usedBytes, setUsedBytes] = useState<number | null>(null)

  useEffect(() => {
    fetchStorageUsage()
  }, [])

  async function fetchStorageUsage() {
    try {
      const { data } = await supabase
        .from('documentos')
        .select('tamanio_bytes')
      if (data) {
        const total = data.reduce((sum, d) => sum + (d.tamanio_bytes || 0), 0)
        setUsedBytes(total)
      }
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pct     = usedBytes !== null ? Math.min((usedBytes / LIMIT_BYTES) * 100, 100) : 0
  const barColor = pct > 80 ? '#D94F4F' : pct > 50 ? '#D97706' : '#2E9668'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ justifyContent: 'center', padding: '20px 16px' }}>
        <img src="/logo-fascioli.svg" alt="Fascioli Seguros" style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block' }} />
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

      <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        {/* Storage indicator */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Almacenamiento
            </span>
            <span style={{ fontSize: 11, color: 'var(--slate-light)' }}>
              {usedBytes !== null ? `${formatBytes(usedBytes)} / ${LIMIT_GB} GB` : '...'}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${pct}%`,
              background: barColor,
              transition: 'width .6s ease'
            }} />
          </div>
          {pct > 80 && (
            <div style={{ fontSize: 10, color: '#D94F4F', marginTop: 4, fontWeight: 600 }}>
              Espacio casi lleno
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ paddingBottom: 16 }}>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-light)', width: '100%' }}
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}

