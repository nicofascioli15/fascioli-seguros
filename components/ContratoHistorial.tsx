'use client'
import { useState, useEffect } from 'react'
import { X, Loader2, FileSignature, RotateCw, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatFecha, hoyISO, enumerarCiclosAuto } from '@/lib/contratosConfig'

type Fila = {
  id: string
  empresa: string | null
  tipo_contrato: string | null
  vigencia_anios: number | null
  fecha_firma_inicio: string | null
  fecha_firma_original: string | null
  renovado: boolean
  created_at: string
}

type Entrada = {
  fecha: string
  tipo: 'Firma original' | 'Renovación manual' | 'Renovación automática'
  empresa: string | null
  tipoContrato: string | null
  vigenciaAnios: number | null
}

// Reconstruye, a partir de las filas reales de "contratos" (una por cada renovación manual,
// encadenadas por cliente_id + categoria) y del cálculo en vivo de ciclos automáticos, el
// historial completo de un contrato: firma original, cada renovación manual (con su propia
// empresa/tipo si cambió) y cada renovación automática (sin cambios, calculada, no guardada).
function construirHistorial(filas: Fila[]): Entrada[] {
  const ordenadas = [...filas].sort((a, b) =>
    (a.fecha_firma_original || a.fecha_firma_inicio || '').localeCompare(b.fecha_firma_original || b.fecha_firma_inicio || '') || a.created_at.localeCompare(b.created_at)
  )
  const hoy = hoyISO()
  const entradas: Entrada[] = []

  ordenadas.forEach((row, i) => {
    const inicio = row.fecha_firma_original || row.fecha_firma_inicio
    if (!inicio) return
    entradas.push({
      fecha: inicio,
      tipo: i === 0 ? 'Firma original' : 'Renovación manual',
      empresa: row.empresa, tipoContrato: row.tipo_contrato, vigenciaAnios: row.vigencia_anios,
    })
    if (!row.vigencia_anios) return
    const siguiente = ordenadas[i + 1]
    const hasta = siguiente ? (siguiente.fecha_firma_original || siguiente.fecha_firma_inicio || hoy) : hoy
    enumerarCiclosAuto(inicio, row.vigencia_anios, hasta).forEach(fecha => {
      entradas.push({ fecha, tipo: 'Renovación automática', empresa: row.empresa, tipoContrato: row.tipo_contrato, vigenciaAnios: row.vigencia_anios })
    })
  })

  return entradas.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

const ICONOS: Record<Entrada['tipo'], any> = {
  'Firma original': FileSignature,
  'Renovación manual': RotateCw,
  'Renovación automática': RefreshCw,
}
const COLORES: Record<Entrada['tipo'], { bg: string; color: string }> = {
  'Firma original': { bg: 'var(--bg-hover)', color: 'var(--navy)' },
  'Renovación manual': { bg: '#E6F5EF', color: '#1A7A4E' },
  'Renovación automática': { bg: '#DBEAFE', color: '#1D4ED8' },
}

export default function ContratoHistorial({ clienteId, categoria, clienteNombre, onClose }: {
  clienteId: string; categoria: string; clienteNombre: string; onClose: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [entradas, setEntradas] = useState<Entrada[]>([])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('contratos')
        .select('id, empresa, tipo_contrato, vigencia_anios, fecha_firma_inicio, fecha_firma_original, renovado, created_at')
        .eq('cliente_id', clienteId)
        .eq('categoria', categoria)
      setEntradas(construirHistorial((data || []) as Fila[]))
      setLoading(false)
    })()
  }, [clienteId, categoria])

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pago-modal" style={{ width: 460, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>Historial del contrato</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{clienteNombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : entradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 13 }}>Sin historial todavía</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entradas.map((e, i) => {
              const Icon = ICONOS[e.tipo]
              const col = COLORES[e.tipo]
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icon size={14} color={col.color} />
                  </div>
                  <div style={{ flex: 1, paddingBottom: 10, borderBottom: i < entradas.length - 1 ? '1px solid #F1F5FB' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>{e.tipo}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{formatFecha(e.fecha)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {e.empresa || '—'}{e.tipoContrato ? ` · ${e.tipoContrato}` : ''}{e.vigenciaAnios ? ` · ${e.vigenciaAnios} ${e.vigenciaAnios === 1 ? 'año' : 'años'}` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  )
}
