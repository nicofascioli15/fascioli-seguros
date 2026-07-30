'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Loader2, RotateCcw, Search, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRol } from '@/lib/useRol'
import { useRouter } from 'next/navigation'
import { Pagination, paginate } from '@/components/Pagination'

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
  poliza_controles_mensuales: 'Control mensual',
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
}

// Campos técnicos que no le sirven a nadie ver (ids, relaciones, metadata) — se ocultan siempre.
const CAMPOS_OCULTOS = new Set([
  'id', 'created_at', 'updated_at', 'cliente_id', 'poliza_id', 'campo_id',
  'clientes', 'polizas', 'doc_count',
])

// Nombres de campo -> etiqueta en criollo. Cubre clientes, pólizas, pagos,
// documentos, siniestros y controles mensuales. Lo que no está acá se
// "humaniza" solo (reemplaza guiones bajos, pone mayúscula inicial).
const CAMPO_LABEL: Record<string, string> = {
  nombre: 'Nombre', direccion: 'Dirección', contacto: 'Contacto', tel: 'Teléfono', email: 'Email', tipo: 'Tipo',
  numero: 'Número', ramo: 'Ramo', compania: 'Compañía', corredor: 'Corredor',
  corredor_nombre: 'Nombre del corredor', corredor_tel: 'Teléfono del corredor',
  moneda: 'Moneda', vencimiento: 'Vencimiento', nota: 'Nota', cuotas: 'Cantidad de cuotas',
  cuota_mes: 'Fechas de cuotas', renovada: 'Renovada', renovacion_mensual: 'Renovación mensual',
  cuota_num: 'Cuota', fecha: 'Fecha de pago', metodo: 'Método', referencia: 'Referencia',
  tamanio_bytes: 'Tamaño', storage_path: 'Archivo',
  descripcion: 'Descripción', fecha_ocurrencia: 'Fecha de ocurrencia', estado: 'Estado',
  periodo: 'Período', fecha_control: 'Fecha de control', fecha_pago: 'Fecha de pago',
}

function humanizar(key: string): string {
  const s = key.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatValorCampo(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  const s = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split('-')
    if (key === 'periodo') return `${MESES_LARGO[parseInt(m, 10) - 1]} ${y}`
    return `${d}/${m}/${y}`
  }
  if (key === 'tamanio_bytes') {
    const n = Number(value)
    if (!isFinite(n)) return s
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
  }
  return s
}

// Muestra los cambios de una entrada del historial en criollo: campo por campo,
// con "antes → después" cuando hay comparación posible, en vez de tirar el JSON
// crudo de la base de datos.
function CambiosDetalle({ log }: { log: LogEntry }) {
  const antes = log.datos_antes && typeof log.datos_antes === 'object' && !Array.isArray(log.datos_antes) ? log.datos_antes : null
  const despues = log.datos_despues

  if (!antes && !despues) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin detalle guardado para esta acción.</div>
  }

  // Alta masiva (ej. importación CSV): datos_despues es un array de registros.
  if (Array.isArray(despues)) {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
          Registros creados ({despues.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 220, overflow: 'auto' }}>
          {despues.slice(0, 80).map((r: any, i: number) => (
            <div key={i} style={{ fontSize: 12.5, color: 'var(--text-main)' }}>{r?.nombre || `Registro ${i + 1}`}</div>
          ))}
          {despues.length > 80 && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>...y {despues.length - 80} más</div>}
        </div>
      </div>
    )
  }

  // Los campos a mostrar son los del lado que representa "lo que se tocó":
  // en una edición o alta, eso es 'después'; en una eliminación, es 'antes'.
  const baseKeys = despues ? Object.keys(despues) : Object.keys(antes || {})
  const claves = baseKeys.filter(k => !CAMPOS_OCULTOS.has(k))

  const hayComparacion = !!antes && !!despues
  const filas = claves
    .map(k => ({ key: k, antes: antes ? antes[k] : undefined, despues: despues ? despues[k] : undefined }))
    .filter(f => !hayComparacion || JSON.stringify(f.antes) !== JSON.stringify(f.despues))

  const esEdicionSinAntes = log.accion === 'editar' && !antes

  if (filas.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No hay cambios en los campos registrados.</div>
  }

  return (
    <div>
      {esEdicionSinAntes && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
          Esta edición es de antes de que empezáramos a guardar el estado anterior — solo se ve el resultado final.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filas.map(f => (
          <div key={f.key} style={{ display: 'flex', gap: 12, fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid #F1F5FB' }}>
            <div style={{ width: 160, flexShrink: 0, fontWeight: 700, color: 'var(--text-muted)' }}>{CAMPO_LABEL[f.key] || humanizar(f.key)}</div>
            <div style={{ flex: 1, minWidth: 0, color: 'var(--text-main)' }}>
              {hayComparacion ? (
                <>
                  <span style={{ textDecoration: 'line-through', color: '#991B1B', opacity: .7 }}>{formatValorCampo(f.key, f.antes)}</span>
                  {'  →  '}
                  <span style={{ fontWeight: 700, color: '#1A7A4E' }}>{formatValorCampo(f.key, f.despues)}</span>
                </>
              ) : (
                <span>{formatValorCampo(f.key, despues ? f.despues : f.antes)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
  const [page, setPage]             = useState(1)

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

  // Una acción sólo se puede revertir si revertir() de verdad va a poder hacer algo:
  // crear necesita el id del registro para poder borrarlo, eliminar necesita el snapshot
  // "antes" para poder reinsertarlo, y editar necesita el snapshot "antes" para restaurarlo.
  function puedeRevertir(log: LogEntry) {
    if (log.accion === 'crear')    return !!log.registro_id
    if (log.accion === 'eliminar') return !!log.datos_antes
    if (log.accion === 'editar')   return !!log.datos_antes && !!log.registro_id
    return false
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
  const paginados = paginate(filtrados, page)

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
            <input placeholder="Buscar acción o usuario..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ padding: '8px 14px 8px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 240, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Módulo:</span>
            {['Todos','clientes','polizas','pagos','siniestros','documentos','poliza_controles_mensuales'].map(t =>
              <button key={t} onClick={() => { setFiltroTabla(t); setPage(1) }} className={`filter-btn ${filtroTabla === t ? 'active' : ''}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                {t === 'Todos' ? 'Todos' : tablaLabel[t]}
              </button>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Acción:</span>
            {['Todos','crear','editar','eliminar'].map(a =>
              <button key={a} onClick={() => { setFiltroAccion(a); setPage(1) }} className={`filter-btn ${filtroAccion === a ? 'active' : ''}`} style={{ padding: '5px 10px', fontSize: 12 }}>
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
          {paginados.map(log => (
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
                {!log.revertido && puedeRevertir(log) && (
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
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)', marginTop: 12 }}>
                  <CambiosDetalle log={log} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={filtrados.length} onChange={setPage} />

      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>{toast}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}


