'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Flame, Droplets, Loader2, Phone, Gauge, AlertTriangle, Bell, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}
function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Alerta = {
  id: string
  tipo: 'Extintor' | 'Tanque' | 'Ensayo hidrostático'
  cliente_nombre: string
  cliente_tel: string
  vencimiento: string | null
  dias: number | null
}

type RegRaw = { id: string; cliente_id: string | null; fecha_servicio: string | null; vencimiento: string | null; vencimiento_ensayo?: string | null; created_at: string; mant_clientes: { nombre: string; tel: string } | null }

function soloVigentes(rows: RegRaw[]): RegRaw[] {
  const porCliente: Record<string, RegRaw[]> = {}
  rows.forEach(r => { if (r.cliente_id) (porCliente[r.cliente_id] ||= []).push(r) })
  return Object.values(porCliente).map(arr =>
    [...arr].sort((a, b) => (b.fecha_servicio || b.created_at || '').localeCompare(a.fecha_servicio || a.created_at || ''))[0]
  )
}

export default function MantenimientoDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [alertas, setAlertas] = useState<Alerta[]>([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: extRaw }, { data: tanRaw }] = await Promise.all([
      supabase.from('mant_extintores').select('id, cliente_id, fecha_servicio, vencimiento, vencimiento_ensayo, created_at, mant_clientes(nombre, tel)'),
      supabase.from('mant_tanques').select('id, cliente_id, fecha_servicio, vencimiento, created_at, mant_clientes(nombre, tel)'),
    ])

    const extVigentes = soloVigentes((extRaw || []) as any)
    const tanVigentes = soloVigentes((tanRaw || []) as any)

    const extAlertas: Alerta[] = extVigentes.map((r: any) => ({
      id: r.id, tipo: 'Extintor', cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar', cliente_tel: r.mant_clientes?.tel || '',
      vencimiento: r.vencimiento, dias: diasHasta(r.vencimiento),
    }))
    const ensayoAlertas: Alerta[] = extVigentes.filter((r: any) => r.vencimiento_ensayo).map((r: any) => ({
      id: `${r.id}-ensayo`, tipo: 'Ensayo hidrostático', cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar', cliente_tel: r.mant_clientes?.tel || '',
      vencimiento: r.vencimiento_ensayo, dias: diasHasta(r.vencimiento_ensayo),
    }))
    const tanAlertas: Alerta[] = tanVigentes.map((r: any) => ({
      id: r.id, tipo: 'Tanque', cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar', cliente_tel: r.mant_clientes?.tel || '',
      vencimiento: r.vencimiento, dias: diasHasta(r.vencimiento),
    }))

    setAlertas([...extAlertas, ...ensayoAlertas, ...tanAlertas].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999)))
    setLoading(false)
  }

  const vencidos = alertas.filter(a => a.dias !== null && a.dias < 0)
  const urgentes = alertas.filter(a => a.dias !== null && a.dias >= 0 && a.dias <= 7)
  const proximos = alertas.filter(a => a.dias !== null && a.dias > 7 && a.dias <= 30)

  // Extintores y ensayo hidrostático van juntos (son parte de la misma gestión); tanques por su lado.
  const alertasExt = alertas.filter(a => a.tipo !== 'Tanque')
  const alertasTan = alertas.filter(a => a.tipo === 'Tanque')
  const vencidosExt = alertasExt.filter(a => a.dias !== null && a.dias < 0)
  const urgentesExt = alertasExt.filter(a => a.dias !== null && a.dias >= 0 && a.dias <= 7)
  const proximosExt = alertasExt.filter(a => a.dias !== null && a.dias > 7 && a.dias <= 30)
  const vencidosTan = alertasTan.filter(a => a.dias !== null && a.dias < 0)
  const urgentesTan = alertasTan.filter(a => a.dias !== null && a.dias >= 0 && a.dias <= 7)
  const proximosTan = alertasTan.filter(a => a.dias !== null && a.dias > 7 && a.dias <= 30)

  type StatCard = { label: string; value: any; sub: string; icon: any; bg: string; iconColor: string; href: string }
  const extCards: StatCard[] = [
    { label: 'Vencidos',    value: loading ? '—' : vencidosExt.length, sub: 'Necesitan atención ya', icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F', href: '/mantenimiento/extintores?dias=0' },
    { label: 'Urgentes',    value: loading ? '—' : urgentesExt.length, sub: '7 días o menos',        icon: Bell,          bg: '#FEE2E2', iconColor: '#D94F4F', href: '/mantenimiento/extintores?dias=7' },
    { label: 'Próximos',    value: loading ? '—' : proximosExt.length, sub: 'Entre 8 y 30 días',      icon: Calendar,      bg: '#FEF3C7', iconColor: '#D97706', href: '/mantenimiento/extintores?dias=30' },
  ]
  const tanCards: StatCard[] = [
    { label: 'Vencidos',    value: loading ? '—' : vencidosTan.length, sub: 'Necesitan atención ya', icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F', href: '/mantenimiento/tanques?dias=0' },
    { label: 'Urgentes',    value: loading ? '—' : urgentesTan.length, sub: '7 días o menos',        icon: Bell,          bg: '#FEE2E2', iconColor: '#D94F4F', href: '/mantenimiento/tanques?dias=7' },
    { label: 'Próximos',    value: loading ? '—' : proximosTan.length, sub: 'Entre 8 y 30 días',      icon: Calendar,      bg: '#FEF3C7', iconColor: '#D97706', href: '/mantenimiento/tanques?dias=30' },
  ]

  function iconoTipo(tipo: Alerta['tipo']) {
    if (tipo === 'Extintor') return <Flame size={18} color="#D97706" />
    if (tipo === 'Ensayo hidrostático') return <Gauge size={18} color="#7C3AED" />
    return <Droplets size={18} color="#0E7490" />
  }
  function bgTipo(tipo: Alerta['tipo']) {
    if (tipo === 'Extintor') return '#FEF3C7'
    if (tipo === 'Ensayo hidrostático') return '#EDE9FE'
    return '#E6F5F9'
  }

  function Section({ title, items, dotColor }: { title: string; items: Alerta[]; dotColor: string }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{title}</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card-alt)', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>
        </div>
        {items.map(a => (
          <div key={`${a.tipo}-${a.id}`} style={{
            background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)',
            padding: '14px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14,
            borderLeft: `3px solid ${dotColor}`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: bgTipo(a.tipo),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {iconoTipo(a.tipo)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{a.cliente_nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                <span className="badge badge-neutral">{a.tipo}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Vence</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatFecha(a.vencimiento)}</div>
              {a.cliente_tel && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                  <a href={`tel:${a.cliente_tel}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Phone size={12} /></a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  function Panel({ title, icon, iconBg, vencidos, urgentes, proximos }: {
    title: string; icon: React.ReactNode; iconBg: string; vencidos: Alerta[]; urgentes: Alerta[]; proximos: Alerta[]
  }) {
    const total = vencidos.length + urgentes.length + proximos.length
    return (
      <div className="dashboard-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{title}</div>
          {total > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card-alt)', padding: '2px 8px', borderRadius: 10 }}>{total}</span>
          )}
        </div>
        {total === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin vencimientos en los próximos 30 días</div>
        ) : (
          <>
            <Section title="Vencidos" items={vencidos} dotColor="#D94F4F" />
            <Section title="Urgentes — 7 días o menos" items={urgentes} dotColor="#D94F4F" />
            <Section title="Próximos — 8 a 30 días" items={proximos} dotColor="#D97706" />
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Mantenimiento</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Control de extintores, tanques de agua y ensayos</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Flame size={15} color="#D97706" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>Extintores</span>
      </div>
      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 22 }}>
        {extCards.map(s => (
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
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Droplets size={15} color="#0E7490" />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>Tanques de agua</span>
      </div>
      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 22 }}>
        {tanCards.map(s => (
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
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando...
        </div>
      ) : alertas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Todavía no hay registros</div>
          <div style={{ fontSize: 12 }}>Empezá cargando edificios en Clientes y sus extintores/tanques</div>
        </div>
      ) : (
        <div className="dashboard-panels">
          <Panel title="Extintores" icon={<Flame size={16} color="#D97706" />} iconBg="#FEF3C7"
            vencidos={vencidosExt} urgentes={urgentesExt} proximos={proximosExt} />
          <Panel title="Tanques de agua" icon={<Droplets size={16} color="#0E7490" />} iconBg="#E6F5F9"
            vencidos={vencidosTan} urgentes={urgentesTan} proximos={proximosTan} />
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
