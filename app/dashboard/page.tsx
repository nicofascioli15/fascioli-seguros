'use client'
import { useEffect, useState } from 'react'
import { FileText, CreditCard, Bell, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ polizas: 0, venc30: 0, cuotasPend: 0, siniestros: 0 })
  const [loading, setLoading] = useState(true)
  const [vencProximas, setVencProximas] = useState<any[]>([])

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const [{ count: polizas }, { data: polizasData }, { count: siniestros }] = await Promise.all([
      supabase.from('polizas').select('*', { count: 'exact', head: true }),
      supabase.from('polizas').select('id, numero, ramo, vencimiento, clientes(nombre)'),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).neq('estado', 'Cerrado'),
    ])

    const venc30 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 30 }).length
    const proximas = (polizasData || [])
      .filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 90 })
      .sort((a, b) => (diasHasta(a.vencimiento) || 0) - (diasHasta(b.vencimiento) || 0))
      .slice(0, 6)

    setStats({ polizas: polizas || 0, venc30, cuotasPend: 0, siniestros: siniestros || 0 })
    setVencProximas(proximas)
    setLoading(false)
  }

  function formatFecha(iso: string | null) {
    if (!iso) return '—'
    const [y,m,d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const statCards = [
    { label: 'Pólizas activas',     value: loading ? '—' : stats.polizas,    sub: 'En cartera',          icon: FileText,      bg: '#EEF2F8', iconColor: '#2456B0' },
    { label: 'Vencen en 30 días',   value: loading ? '—' : stats.venc30,     sub: 'Requieren atención',  icon: Bell,          bg: '#FEF3C7', iconColor: '#D97706' },
    { label: 'Siniestros abiertos', value: loading ? '—' : stats.siniestros, sub: 'En gestión',          icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F' },
    { label: 'Clientes',            value: loading ? '—' : '—',              sub: 'Cargando...',         icon: CreditCard,    bg: '#E6F5EF', iconColor: '#2A7A56' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
          {new Date().toLocaleDateString('es-UY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="label">{s.label}</div>
                <div className="value">{s.value}</div>
                <div className="sub">{s.sub}</div>
              </div>
              <div style={{ background: s.bg, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <s.icon size={20} color={s.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Próximos vencimientos */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🔔 Próximos vencimientos</div>
          {loading ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>Cargando...</div>
          ) : vencProximas.length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>No hay vencimientos próximos</div>
          ) : vencProximas.map(p => {
            const d = diasHasta(p.vencimiento)
            const cls = d !== null && d <= 7 ? 'badge-danger' : d !== null && d <= 30 ? 'badge-warning' : 'badge-success'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F5FB' }}>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{p.ramo}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p.clientes as any)?.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--slate)', fontFamily: 'monospace' }}>{p.numero}</span>
                <span className={`badge ${cls}`}>{d}d</span>
              </div>
            )
          })}
          {vencProximas.length > 0 && (
            <a href="/vencimientos" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
          )}
        </div>

        {/* Accesos rápidos */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>⚡ Accesos rápidos</div>
          {[
            { href: '/clientes', icon: '👥', label: 'Nuevo cliente', sub: 'Agregar un cliente a la cartera' },
            { href: '/polizas', icon: '📄', label: 'Nueva póliza', sub: 'Cargar una póliza existente' },
            { href: '/vencimientos', icon: '🔔', label: 'Ver vencimientos', sub: 'Pólizas próximas a vencer' },
            { href: '/siniestros', icon: '🛡️', label: 'Nuevo siniestro', sub: 'Registrar un siniestro' },
          ].map(a => (
            <a key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', transition: 'background .12s', marginBottom: 4 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>{a.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

