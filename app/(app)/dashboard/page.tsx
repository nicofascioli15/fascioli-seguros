'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { FileText, CreditCard, Bell, AlertTriangle, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ polizas: 0, venc30: 0, venc7: 0, siniestros: 0, clientes: 0 })
  const [loading, setLoading] = useState(true)
  const [vencProximas, setVencProximas] = useState<any[]>([])

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const [{ count: polizas }, { data: polizasData }, { count: siniestros }, { count: clientes }] = await Promise.all([
      supabase.from('polizas').select('*', { count: 'exact', head: true }),
      supabase.from('polizas').select('id, numero, ramo, vencimiento, clientes(nombre)'),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).neq('estado', 'Cerrado'),
      supabase.from('clientes').select('*', { count: 'exact', head: true }),
    ])
    const venc30 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 30 }).length
    const proximas = (polizasData || [])
      .filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 90 })
      .sort((a, b) => (diasHasta(a.vencimiento) || 0) - (diasHasta(b.vencimiento) || 0))
      .slice(0, 6)
    const venc7 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 7 }).length
    setStats({ polizas: polizas || 0, venc30, venc7, siniestros: siniestros || 0, clientes: clientes || 0 })
    setVencProximas(proximas)
    setLoading(false)
  }

  function formatFecha(iso: string | null) {
    if (!iso) return '—'
    const [y,m,d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const statCards: { label: string; value: any; sub: string; icon: any; bg: string; iconColor: string; href?: string }[] = [
    { label: 'Pólizas activas',     value: loading ? '—' : stats.polizas,    sub: 'En cartera',         icon: FileText,      bg: '#EEF2F8', iconColor: '#2456B0', href: '/polizas' },
    { label: 'Vencen en 30 días',   value: loading ? '—' : stats.venc30,     sub: 'Ver vencimientos →', icon: Bell,          bg: '#FEF3C7', iconColor: '#D97706', href: '/vencimientos' },
    { label: 'Siniestros abiertos', value: loading ? '—' : stats.siniestros, sub: 'En gestión',         icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F', href: '/siniestros' },
    { label: 'Clientes',            value: loading ? '—' : stats.clientes,   sub: 'Registrados',        icon: Users,         bg: '#E6F5EF', iconColor: '#2A7A56', href: '/clientes' },
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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
          {new Date().toLocaleDateString('es-UY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats — CSS class handles responsive */}
      <div className="dashboard-stats">
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
      <div className="dashboard-panels">
        {/* Próximos vencimientos */}
        <div className="dashboard-panel">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Próximos vencimientos</div>
          {loading ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>Cargando...</div>
          ) : vencProximas.length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>No hay vencimientos próximos</div>
          ) : vencProximas.map(p => {
            const d = diasHasta(p.vencimiento)
            const cls = d !== null && d <= 7 ? 'badge-danger' : d !== null && d <= 30 ? 'badge-warning' : 'badge-success'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F5FB', overflow: 'hidden' }}>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{p.ramo}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p.clientes as any)?.nombre}</span>
                <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{d}d</span>
              </div>
            )
          })}
          {vencProximas.length > 0 && (
            <a href="/vencimientos" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
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
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>{sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

