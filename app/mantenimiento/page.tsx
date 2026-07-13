'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Building2, Flame, Droplets, Loader2, Phone, Gauge } from 'lucide-react'
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
  const [stats, setStats] = useState({ edificios: 0, extintores: 0, tanques: 0 })
  const [alertas, setAlertas] = useState<Alerta[]>([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ count: edificios }, { data: extRaw }, { data: tanRaw }] = await Promise.all([
      supabase.from('mant_clientes').select('*', { count: 'exact', head: true }),
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

    setStats({ edificios: edificios || 0, extintores: extVigentes.length, tanques: tanVigentes.length })
    setAlertas([...extAlertas, ...ensayoAlertas, ...tanAlertas].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999)))
    setLoading(false)
  }

  const vencidos = alertas.filter(a => a.dias !== null && a.dias < 0)
  const urgentes = alertas.filter(a => a.dias !== null && a.dias >= 0 && a.dias <= 7)
  const proximos = alertas.filter(a => a.dias !== null && a.dias > 7 && a.dias <= 30)
  const vencen30 = vencidos.length + urgentes.length + proximos.length

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
      <div style={{ marginBottom: 28 }}>
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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Mantenimiento</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Control de extintores, tanques de agua y ensayos</p>
      </div>

      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="value">{loading ? '—' : stats.edificios}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Building2 size={13} /> Edificios</div>
        </div>
        <div className="stat-card">
          <div className="value">{loading ? '—' : stats.extintores}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Flame size={13} /> Extintores</div>
        </div>
        <div className="stat-card">
          <div className="value">{loading ? '—' : stats.tanques}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Droplets size={13} /> Tanques de agua</div>
        </div>
        <div className="stat-card" style={{ borderColor: vencen30 > 0 ? 'var(--danger)' : undefined }}>
          <div className="value" style={{ color: vencen30 > 0 ? 'var(--danger)' : undefined }}>{loading ? '—' : vencen30}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Vencen en 30 días</div>
        </div>
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
        <>
          <Section title="Vencidos" items={vencidos} dotColor="#D94F4F" />
          <Section title="Urgentes — vencen en 7 días o menos" items={urgentes} dotColor="#D94F4F" />
          <Section title="Próximos — 8 a 30 días" items={proximos} dotColor="#D97706" />
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
