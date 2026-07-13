'use client'
import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { estadoBadgeClass } from '@/lib/mantenimientoConfig'

type Registro = {
  id: string
  fecha_servicio: string | null
  vencimiento: string | null
  empresa: string
  estado: string
  comentarios: string
}

type Props = {
  tabla: 'mant_extintores' | 'mant_tanques'
  clienteId: string
  clienteNombre: string
  onClose: () => void
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function MantHistorial({ tabla, clienteId, clienteNombre, onClose }: Props) {
  const supabase = createClient()
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchHistorial() }, [tabla, clienteId])

  async function fetchHistorial() {
    setLoading(true)
    const { data } = await supabase.from(tabla)
      .select('id, fecha_servicio, vencimiento, empresa, estado, comentarios, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    const sorted = (data || []).sort((a: any, b: any) => (b.fecha_servicio || b.created_at || '').localeCompare(a.fecha_servicio || a.created_at || ''))
    setRegistros(sorted)
    setLoading(false)
  }

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pago-modal" style={{ width: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Historial</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>{clienteNombre}</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : registros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin gestiones registradas</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {registros.map((r, i) => (
              <div key={r.id} style={{ padding: '11px 14px', border: '1px solid var(--border-soft)', borderRadius: 10, opacity: i === 0 ? 1 : 0.75 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {i === 0 && <span className="badge badge-gold" style={{ marginRight: 6 }}>Vigente</span>}
                    {r.fecha_servicio ? `Servicio ${formatFecha(r.fecha_servicio)}` : 'Sin fecha de servicio'}
                  </div>
                  {r.estado && <span className={`badge ${estadoBadgeClass(r.estado)}`}>{r.estado}</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Vence {formatFecha(r.vencimiento)}{r.empresa && ` · ${r.empresa}`}
                </div>
                {r.comentarios && <div style={{ fontSize: 12.5, marginTop: 4 }}>{r.comentarios}</div>}
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  )
}
