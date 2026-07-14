'use client'
import { useState, useEffect } from 'react'
import { X, Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { estadoBadgeClass, TIPOS_EXTINTOR, EXTRAS_EXTINTORES } from '@/lib/mantenimientoConfig'

type Registro = {
  id: string
  fecha_servicio: string | null
  vencimiento: string | null
  empresa: string
  estado: string
  comentarios: string
  cant_co2?: number
  cant_8kg?: number
  cant_4kg?: number
  cant_espuma?: number
  cant_ensayo_hidrostatico?: number
  vencimiento_ensayo?: string | null
  extras?: Record<string, number>
}

type Props = {
  tabla: 'mant_extintores' | 'mant_tanques'
  clienteId: string
  clienteNombre: string
  onClose: () => void
  onChanged?: () => void
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function MantHistorial({ tabla, clienteId, clienteNombre, onClose, onChanged }: Props) {
  const supabase = createClient()
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  useEffect(() => { fetchHistorial() }, [tabla, clienteId])

  async function fetchHistorial() {
    setLoading(true)
    const baseCols = 'id, fecha_servicio, vencimiento, empresa, estado, comentarios, created_at'
    const extraCols = tabla === 'mant_extintores' ? ', cant_co2, cant_8kg, cant_4kg, cant_espuma, cant_ensayo_hidrostatico, vencimiento_ensayo, extras' : ''
    const { data } = await supabase.from(tabla)
      .select(`${baseCols}${extraCols}`)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    const sorted = ((data as any[]) || []).sort((a: any, b: any) => (b.fecha_servicio || b.created_at || '').localeCompare(a.fecha_servicio || a.created_at || ''))
    setRegistros(sorted as Registro[])
    setLoading(false)
  }

  async function eliminarRegistro(r: Registro) {
    if (!confirm(`¿Eliminar esta gestión${r.fecha_servicio ? ` (servicio ${formatFecha(r.fecha_servicio)})` : ''}? Esta acción no se puede deshacer.`)) return
    setEliminandoId(r.id)
    await supabase.from(tabla).delete().eq('id', r.id)
    await registrarAudit({ accion: 'eliminar', tabla, registroId: r.id, descripcion: 'Gestión eliminada desde el historial', datosAntes: r })
    setEliminandoId(null)
    await fetchHistorial()
    onChanged?.()
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {r.estado && <span className={`badge ${estadoBadgeClass(r.estado)}`}>{r.estado}</span>}
                    <button title="Eliminar esta gestión" onClick={() => eliminarRegistro(r)} disabled={eliminandoId === r.id}
                      style={{ background: 'none', border: 'none', cursor: eliminandoId === r.id ? 'default' : 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
                      {eliminandoId === r.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Vence {formatFecha(r.vencimiento)}{r.empresa && ` · ${r.empresa}`}
                </div>

                {tabla === 'mant_extintores' && (() => {
                  const cant = (r.cant_co2 || 0) + (r.cant_8kg || 0) + (r.cant_4kg || 0) + (r.cant_espuma || 0)
                  const detalleTipos = TIPOS_EXTINTOR
                    .map(t => ({ label: t.label, v: (r as any)[t.key] || 0 }))
                    .filter(t => t.v > 0)
                  const extrasActivos = EXTRAS_EXTINTORES
                    .map(ex => ({ label: ex.label, v: r.extras?.[ex.key] || 0 }))
                    .filter(ex => ex.v > 0)
                  if (cant === 0 && !r.vencimiento_ensayo && extrasActivos.length === 0) return null
                  return (
                    <div style={{ fontSize: 12, color: 'var(--text-main)', marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--border-soft)' }}>
                      {cant > 0 && (
                        <div style={{ marginBottom: 3 }}>
                          <span style={{ fontWeight: 700 }}>Recargados ({cant}):</span>{' '}
                          {detalleTipos.map(t => `${t.label} ${t.v}`).join(' · ') || '—'}
                        </div>
                      )}
                      {r.vencimiento_ensayo && (
                        <div style={{ marginBottom: 3 }}>
                          <span style={{ fontWeight: 700 }}>Ensayo hidrostático:</span>{' '}
                          {r.cant_ensayo_hidrostatico ? `${r.cant_ensayo_hidrostatico} realizados · ` : ''}vence {formatFecha(r.vencimiento_ensayo)}
                        </div>
                      )}
                      {extrasActivos.length > 0 && (
                        <div>
                          <span style={{ fontWeight: 700 }}>Extras:</span>{' '}
                          {extrasActivos.map(ex => `${ex.label} ${ex.v}`).join(' · ')}
                        </div>
                      )}
                    </div>
                  )
                })()}

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
