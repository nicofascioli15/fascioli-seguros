'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Loader2, RotateCcw, Search, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRol } from '@/lib/useRol'
import { useRouter } from 'next/navigation'

type LogEntry = {
  id: string
  usuario_email: string
  accion: 'crear' | 'editar' | 'eliminar'
  tabla: string
  registro_id: string | null
  descripcion: string
  datos_antes: any
  datos_despues: any
  revertido: boolean
  created_at: string
}

const accionColor: Record<string, string> = {
  crear:    'badge-success',
  editar:   'badge-blue',
  eliminar: 'badge-danger',
}
const accionBg: Record<string, string> = {
  crear:    '#E6F5EF',
  editar:   '#DBEAFE',
  eliminar: '#FEE2E2',
}
const accionColor2: Record<string, string> = {
  crear:    '#1A7A4E',
  editar:   '#1E40AF',
  eliminar: '#991B1B',
}
const tablaLabel: Record<string, string> = {
  clientes: 'Cliente', polizas: 'Póliza', pagos: 'Pago', siniestros: 'Siniestro', documentos: 'Documento',
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
}

export default function HistorialPage() {
  const supabase = createClient()
  const { esSuperAdmin, loading: loadingRol } = useRol()
  const router = useRouter()
  const [logs, setLogs]             = useState<LogEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroTabla, setFiltroTabla]   = useState('Todos')
  const [filtroAccion, setFiltroAccion] = useState('Todos')
  const [reverting, setReverting]   = useState<string | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const [expandido, setExpandido]   = useState<string | null>(null)

  useEffect(() => {
    if (!loadingRol && !esSuperAdmin) router.push('/dashboard')
  }, [loadingRol, esSuperAdmin])

  useEffect(() => { fetchLogs() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500) }

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) setLogs(data)
    setLoading(false)
  }

  async function revertir(log: LogEntry) {
    if (!confirm(`¿Revertir esta acción?\n${log.descripcion}`)) return
    setReverting(log.id)
    try {
      if (log.accion === 'crear' && log.registro_id) {
        await supabase.from(log.tabla).delete().eq('id', log.registro_id)
        showToast('Creación revertida — registro eliminado')
      } else if (log.accion === 'eliminar' && log.datos_antes) {
        await supabase.from(log.tabla).insert([log.datos_antes])
        showToast('Registro restaurado correctamente')
      } else if (log.accion === 'editar' && log.datos_antes && log.registro_id) {
        const { id, created_at, ...resto } = log.datos_antes
        await supabase.from(log.tabla).update(resto).eq('id', log.registro_id)
        showToast('Cambios revertidos correctamente')
      }
      await supabase.from('audit_log').update({ revertido: true }).eq('id', log.id)
      await fetchLogs()
    } catch { showToast('Error al revertir') }
    setReverting(null)
  }

  const filtrados = logs.filter(l => {
    const q = search.toLowerCase()
    return (!q || l.descripcion?.toLowerCase().includes(q) || l.usuario_email?.toLowerCase().includes(q)) &&
           (filtroTabla === 'Todos' || l.tabla === filtroTabla) &&
           (filtroAccion === 'Todos' || l.accion === filtroAccion)
  })

  const stats = {
    total:    logs.length,
    hoy:      logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    eliminar: logs.filter(l => l.accion === 'eliminar' && !l.revertido).length,
  }

  if (loadingRol) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Historial de cambios</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Solo visible para Super Admin</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total acciones',     value: stats.total,    bg: '#EEF2F8', color: 'var(--text-main)' },
          { label: 'Acciones hoy',       value: stats.hoy,      bg: '#DBEAFE', color: '#1E40AF' },
          { label: 'Eliminaciones activas', value: stats.eliminar, bg: '#FEE2E2', color: '#991B1B' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: s.color, opacity: .7, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input placeholder="Buscar acción o usuario..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 14px 8px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 240, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Módulo:</span>
            {['Todos','clientes','polizas','pagos','siniestros','documentos'].map(t =>
              <button key={t} onClick={() => setFiltroTabla(t)} className={`filter-btn ${filtroTabla === t ? 'active' : ''}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                {t === 'Todos' ? 'Todos' : tablaLabel[t]}
              </button>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Acción:</span>
            {['Todos','crear','editar','eliminar'].map(a =>
              <button key={a} onClick={() => setFiltroAccion(a)} className={`filter-btn ${filtroAccion === a ? 'active' : ''}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                {a === 'Todos' ? 'Todas' : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando historial...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin registros aún</div>
          <div style={{ fontSize: 12 }}>Las acciones del sistema aparecerán aquí automáticamente</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.map(log => (
            <div key={log.id} style={{
              background: log.revertido ? '#F8FAFC' : 'white',
              borderRadius: 12, border: '1px solid var(--border-soft)',
              overflow: 'hidden', opacity: log.revertido ? 0.55 : 1,
              transition: 'box-shadow .15s'
            }}>
              <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setExpandido(expandido === log.id ? null : log.id)}>

                {/* Acción dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accionColor2[log.accion], flexShrink: 0 }} />

                {/* Badges */}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: accionBg[log.accion], color: accionColor2[log.accion], flexShrink: 0 }}>
                  {log.accion.charAt(0).toUpperCase() + log.accion.slice(1)}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: 11, flexShrink: 0 }}>
                  {tablaLabel[log.tabla] || log.tabla}
                </span>

                {/* Descripción */}
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-main)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.descripcion}
                </div>

                {log.revertido && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0, background: 'var(--bg-card-alt)', padding: '2px 8px', borderRadius: 6 }}>Revertido</span>
                )}

                {/* Usuario + fecha */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{log.usuario_email?.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFecha(log.created_at)}</div>
                </div>

                {/* Revertir */}
                {!log.revertido && (log.accion !== 'editar' || log.datos_antes) && (
                  <button className="btn-outline btn-sm"
                    style={{ fontSize: 11, color: 'var(--danger)', borderColor: '#FEE2E2', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); revertir(log) }}
                    disabled={reverting === log.id}
                  >
                    {reverting === log.id
                      ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      : <><RotateCcw size={12} /> Revertir</>}
                  </button>
                )}

                <ChevronDown size={14} color="var(--slate)" style={{ flexShrink: 0, transition: 'transform .2s', transform: expandido === log.id ? 'rotate(180deg)' : '' }} />
              </div>

              {/* Detalle */}
              {expandido === log.id && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: log.datos_antes && log.datos_despues ? '1fr 1fr' : '1fr', gap: 12, marginTop: 12 }}>
                    {log.datos_antes && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#991B1B', marginBottom: 6 }}>Antes</div>
                        <pre style={{ fontSize: 11, background: '#FEF2F2', borderRadius: 8, padding: '10px 12px', overflow: 'auto', maxHeight: 200, color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                          {JSON.stringify(log.datos_antes, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.datos_despues && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#1A7A4E', marginBottom: 6 }}>Después</div>
                        <pre style={{ fontSize: 11, background: '#F0FDF4', borderRadius: 8, padding: '10px 12px', overflow: 'auto', maxHeight: 200, color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                          {JSON.stringify(log.datos_despues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>{toast}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}


