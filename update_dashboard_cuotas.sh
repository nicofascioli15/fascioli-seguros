#!/bin/bash
set -e
mkdir -p 'app/(app)/dashboard'
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

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const [{ data: polizasData }, { count: siniestros }, { data: pagosData }] = await Promise.all([
      supabase.from('polizas').select('id, numero, ramo, vencimiento, cuotas, cuota_mes, clientes(nombre)'),
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
          cuotaRows.push({ poliza_id: pol.id, cuota_num: n, ramo: pol.ramo, cliente: (pol.clientes as any)?.nombre, fecha, dias: d })
        }
      }
    }
    cuotaRows.sort((a, b) => a.dias - b.dias)
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
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-soft)', overflow: 'hidden' }}>
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
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-soft)', overflow: 'hidden' }}>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{c.ramo}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.cliente} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>· C{c.cuota_num}</span>
                </span>
                <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{c.dias}d</span>
              </div>
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
git add .
git commit -m 'feat dashboard panel vencimiento cuotas separado de polizas'
git push
