'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Plus, X, Loader2, Pencil, Trash2, AlertTriangle, RotateCw, Paperclip, MessageSquareWarning, History } from 'lucide-react'
import { useSortFilter } from '@/hooks/useSortFilter'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import ExportButton from '@/components/ExportButton'
import { Pagination, paginate } from '@/components/Pagination'
import { SortHeader } from '@/components/SortHeader'
import DatePicker from '@/components/DatePicker'
import MantDocumentos from '@/components/MantDocumentos'
import MantReclamos from '@/components/MantReclamos'
import MantHistorial from '@/components/MantHistorial'
import ActionsMenu from '@/components/ActionsMenu'
import {
  TIPOS_TRAMITE_BOMBEROS, DECRETOS_BOMBEROS, ESTADOS_BOMBEROS, ETAPAS_PLAN_GRADUAL,
  DOCS_TIPOS_BOMBEROS, estadoBomberosBadgeClass, sumarAnios,
} from '@/lib/mantenimientoConfig'

type Item = {
  id: string
  cliente_id: string | null
  cliente_nombre: string
  fecha_certificacion: string | null
  vencimiento: string | null
  tipo_tramite: string
  decreto: string
  tecnico_registrado: string
  empresa: string
  costo: number | null
  estado: string
  etapa_actual: string
  fecha_c1: string | null
  fecha_c2: string | null
  fecha_c3: string | null
  comentarios: string
  created_at: string
  dias: number | null
  vigente: boolean
  docsCount: number
}
type ClienteOpt = { id: string; nombre: string; direccion?: string }

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

function vencBadge(dias: number | null): { label: string; cls: string } {
  if (dias === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (dias < 0) return { label: `Vencido (${Math.abs(dias)}d)`, cls: 'badge-danger' }
  if (dias <= 30) return { label: `${dias}d`, cls: 'badge-danger' }
  if (dias <= 90) return { label: `${dias}d`, cls: 'badge-warning' }
  return { label: `${dias}d`, cls: 'badge-success' }
}

export const emptyForm = {
  cliente_id: '', fecha_certificacion: '', vencimiento: '',
  tipo_tramite: '', decreto: '372/023', tecnico_registrado: '', empresa: '', costo: 0,
  estado: 'Sin gestión', etapa_actual: '', fecha_c1: '', fecha_c2: '', fecha_c3: '', comentarios: '',
}

export default function MantBomberosPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [items, setItems]       = useState<Item[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtroDias, setFiltroDias] = useState(-1)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [page, setPage]         = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [paso, setPaso]           = useState<'cliente' | 'gestion'>('gestion')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteLocked, setClienteLocked] = useState<ClienteOpt | null>(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)

  const [editando, setEditando]   = useState<Item | null>(null)
  const [editForm, setEditForm]   = useState(emptyForm)
  const [savingEdit, setSavingEdit] = useState(false)

  const [confirmEliminar, setConfirmEliminar] = useState<Item | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const [docsFor, setDocsFor] = useState<Item | null>(null)
  const [reclamosFor, setReclamosFor] = useState<Item | null>(null)
  const [historialFor, setHistorialFor] = useState<Item | null>(null)
  const [exportScope, setExportScope] = useState<'vigentes' | 'historial'>('vigentes')

  useEffect(() => { fetchAll() }, [])

  // Si se llega con ?dias=X (ej. desde una card del dashboard), aplicar ese filtro y limpiar la URL
  useEffect(() => {
    const diasParam = searchParams.get('dias')
    if (diasParam !== null) {
      const n = parseInt(diasParam)
      if (!isNaN(n)) setFiltroDias(n)
      router.replace('/mantenimiento/bomberos')
    }
  }, [searchParams])

  async function fetchAll() {
    setLoading(true)
    const cols = 'id, cliente_id, fecha_certificacion, vencimiento, tipo_tramite, decreto, tecnico_registrado, empresa, costo, estado, etapa_actual, fecha_c1, fecha_c2, fecha_c3, comentarios, created_at'
    const [{ data: itemsData }, { data: clientesData }, { data: empresasData }] = await Promise.all([
      supabase.from('mant_bomberos').select(`${cols}, mant_clientes(nombre)`).order('vencimiento', { ascending: true, nullsFirst: false }),
      supabase.from('mant_clientes').select('id, nombre, direccion').order('nombre'),
      supabase.from('mant_empresas').select('nombre').eq('tabla', 'mant_bomberos').order('nombre'),
    ])
    if (empresasData) setEmpresas(empresasData.map((e: any) => e.nombre))
    if (itemsData) {
      const mapped: Item[] = itemsData.map((r: any) => ({
        id: r.id,
        cliente_id: r.cliente_id,
        cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar',
        fecha_certificacion: r.fecha_certificacion,
        vencimiento: r.vencimiento,
        tipo_tramite: r.tipo_tramite || '',
        decreto: r.decreto || '',
        tecnico_registrado: r.tecnico_registrado || '',
        empresa: r.empresa || '',
        costo: r.costo,
        estado: r.estado || '',
        etapa_actual: r.etapa_actual || '',
        fecha_c1: r.fecha_c1,
        fecha_c2: r.fecha_c2,
        fecha_c3: r.fecha_c3,
        comentarios: r.comentarios || '',
        created_at: r.created_at,
        dias: diasHasta(r.vencimiento),
        vigente: false,
        docsCount: 0,
      }))
      // Vigente = gestión más reciente por edificio (certificación, si no hay, fecha de alta)
      const porCliente: Record<string, Item[]> = {}
      mapped.forEach(it => { if (it.cliente_id) (porCliente[it.cliente_id] ||= []).push(it) })
      Object.values(porCliente).forEach(arr => {
        const masReciente = [...arr].sort((a, b) => (b.fecha_certificacion || b.created_at || '').localeCompare(a.fecha_certificacion || a.created_at || ''))[0]
        if (masReciente) masReciente.vigente = true
      })

      // Conteo de documentos adjuntos por registro
      const ids = mapped.map(it => it.id)
      if (ids.length > 0) {
        const { data: docsData } = await supabase.from('mant_documentos').select('bombero_id').in('bombero_id', ids)
        const counts: Record<string, number> = {}
        ;(docsData || []).forEach((d: any) => { const k = d.bombero_id; if (k) counts[k] = (counts[k] || 0) + 1 })
        mapped.forEach(it => { it.docsCount = counts[it.id] || 0 })
      }

      setItems(mapped)
    }
    if (clientesData) setClientes(clientesData)
    setLoading(false)
  }

  function payloadDe(f: typeof emptyForm) {
    const esPlanGradual = f.tipo_tramite === 'PG'
    return {
      cliente_id: f.cliente_id,
      fecha_certificacion: f.fecha_certificacion || null,
      vencimiento: f.vencimiento || null,
      tipo_tramite: f.tipo_tramite || null,
      decreto: f.decreto || null,
      tecnico_registrado: f.tecnico_registrado || null,
      empresa: f.empresa || null,
      costo: f.costo || null,
      estado: f.estado || null,
      etapa_actual: esPlanGradual ? (f.etapa_actual || null) : null,
      fecha_c1: esPlanGradual ? (f.fecha_c1 || null) : null,
      fecha_c2: esPlanGradual ? (f.fecha_c2 || null) : null,
      fecha_c3: esPlanGradual ? (f.fecha_c3 || null) : null,
      comentarios: f.comentarios || null,
    }
  }

  async function guardar() {
    if (!form.cliente_id) return
    setSaving(true)
    const { error, data } = await supabase.from('mant_bomberos').insert([payloadDe(form)]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'mant_bomberos', registroId: data.id, descripcion: 'Habilitación de bomberos — nuevo trámite', datosDespues: data })
      setForm(emptyForm)
      setClienteLocked(null)
      setShowModal(false)
      await fetchAll()
    }
    setSaving(false)
  }

  function abrirEditar(it: Item) {
    setEditando(it)
    setEditForm({
      cliente_id: it.cliente_id || '',
      fecha_certificacion: it.fecha_certificacion || '',
      vencimiento: it.vencimiento || '',
      tipo_tramite: it.tipo_tramite,
      decreto: it.decreto,
      tecnico_registrado: it.tecnico_registrado,
      empresa: it.empresa,
      costo: it.costo || 0,
      estado: it.estado,
      etapa_actual: it.etapa_actual,
      fecha_c1: it.fecha_c1 || '',
      fecha_c2: it.fecha_c2 || '',
      fecha_c3: it.fecha_c3 || '',
      comentarios: it.comentarios,
    })
  }

  function abrirNuevaGestion(it: Item) {
    setForm({ ...emptyForm, cliente_id: it.cliente_id || '', empresa: it.empresa, decreto: it.decreto || '372/023' })
    setClienteLocked({ id: it.cliente_id || '', nombre: it.cliente_nombre })
    setPaso('gestion')
    setShowModal(true)
  }

  async function guardarEdicion() {
    if (!editando || !editForm.cliente_id) return
    setSavingEdit(true)
    await supabase.from('mant_bomberos').update(payloadDe(editForm)).eq('id', editando.id)
    await registrarAudit({ accion: 'editar', tabla: 'mant_bomberos', registroId: editando.id, descripcion: 'Habilitación de bomberos editada', datosAntes: editando, datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchAll()
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await supabase.from('mant_bomberos').delete().eq('id', confirmEliminar.id)
    await registrarAudit({ accion: 'eliminar', tabla: 'mant_bomberos', registroId: confirmEliminar.id, descripcion: 'Habilitación de bomberos eliminada', datosAntes: confirmEliminar })
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchAll()
  }

  const estadosDisponibles = Array.from(new Set([...ESTADOS_BOMBEROS, ...items.map(i => i.estado).filter(Boolean)]))

  function matchFiltros(it: Item) {
    const q = search.toLowerCase()
    const matchQ = !q || it.cliente_nombre.toLowerCase().includes(q) || it.empresa.toLowerCase().includes(q) || it.tecnico_registrado.toLowerCase().includes(q) || it.comentarios.toLowerCase().includes(q)
    const matchDias = filtroDias === -1 ? true : filtroDias === 0 ? (it.dias !== null && it.dias < 0) : (it.dias !== null && it.dias >= 0 && it.dias <= filtroDias)
    const matchEstado = !filtroEstado || it.estado === filtroEstado
    return matchQ && matchDias && matchEstado
  }

  const filtradosBase = items.filter(it => it.vigente && matchFiltros(it))
  const { sort, toggleSort, sorted: filtrados } = useSortFilter<Item>(filtradosBase)
  const paginados = paginate(filtrados, page) as Item[]
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  const EXPORT_SCOPES: { value: typeof exportScope; label: string }[] = [
    { value: 'vigentes',  label: 'Vigentes (todos los estados)' },
    { value: 'historial', label: 'Historial completo (todos los trámites)' },
  ]
  const itemsExport = (() => {
    const q = search.toLowerCase()
    const matchQ = (it: Item) => !q || it.cliente_nombre.toLowerCase().includes(q) || it.empresa.toLowerCase().includes(q)
    let base = items.filter(matchQ)
    if (exportScope === 'vigentes') base = base.filter(it => it.vigente)
    return [...base].sort((a, b) => {
      const byCliente = a.cliente_nombre.localeCompare(b.cliente_nombre)
      if (byCliente !== 0) return byCliente
      return (b.fecha_certificacion || b.created_at || '').localeCompare(a.fecha_certificacion || a.created_at || '')
    })
  })()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Habilitación de Bomberos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {items.filter(i => i.vigente).length} edificios con seguimiento
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={exportScope} onChange={e => setExportScope(e.target.value as typeof exportScope)}
            style={{ padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)' }}>
            {EXPORT_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <ExportButton
            titulo={`Habilitación de Bomberos — ${EXPORT_SCOPES.find(s => s.value === exportScope)?.label}`}
            subtitulo={`${itemsExport.length} registros`}
            columnas={[
              { header: 'Edificio', key: 'edificio', width: 110 },
              ...(exportScope === 'historial' ? [{ header: 'Vigente', key: 'vigente', width: 40 }] : []),
              { header: 'Tipo trámite', key: 'tipo_tramite', width: 55 },
              { header: 'Decreto', key: 'decreto', width: 55 },
              { header: 'Certificación', key: 'fecha_certificacion', width: 62 },
              { header: 'Vencimiento', key: 'vencimiento', width: 62 },
              { header: 'Estado', key: 'estado', width: 85 },
              { header: 'Empresa', key: 'empresa', width: 80 },
              { header: 'Técnico registrado', key: 'tecnico_registrado', width: 90 },
              { header: 'Comentarios', key: 'comentarios' },
            ]}
            filas={itemsExport.map(it => ({
              edificio: it.cliente_nombre,
              vigente: it.vigente ? 'Sí' : '—',
              tipo_tramite: it.tipo_tramite || '—',
              decreto: it.decreto || '—',
              fecha_certificacion: formatFecha(it.fecha_certificacion),
              vencimiento: formatFecha(it.vencimiento),
              estado: it.estado || '—',
              empresa: it.empresa || '—',
              tecnico_registrado: it.tecnico_registrado || '—',
              comentarios: it.comentarios || '—',
            }))}
            filename={`mant_bomberos-${exportScope}-fascioli`}
          />
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setClienteLocked(null); setClienteSearch(''); setPaso('cliente'); setShowModal(true) }}>
            <Plus size={15} /> Nuevo trámite
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar edificio, empresa, técnico..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 260, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ l: 'Vencidos', v: 0 }, { l: '30 días', v: 30 }, { l: '90 días', v: 90 }, { l: '180 días', v: 180 }, { l: 'Todos', v: -1 }].map(t =>
            <button key={t.v} onClick={() => { setFiltroDias(t.v); setPage(1) }} className={`filter-btn ${filtroDias === t.v ? 'active' : ''}`}>{t.l}</button>
          )}
        </div>
        {estadosDisponibles.length > 0 && (
          <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1) }}
            style={{ padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--navy)' }}>
            <option value="">Todos los estados</option>
            {estadosDisponibles.map(es => <option key={es} value={es}>{es}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin registros</div>
          <div style={{ fontSize: 12 }}>{items.length === 0 ? 'Registrá el primer trámite arriba' : 'Probá cambiando los filtros'}</div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <SortHeader label="Edificio" col="cliente_nombre" sort={sort} onSort={toggleSort} />
                <th>Trámite</th>
                <SortHeader label="Vencimiento" col="vencimiento" sort={sort} onSort={toggleSort} />
                <th>Estado</th>
                <th>Empresa</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(it => {
                const b = vencBadge(it.dias)
                return (
                  <tr key={it.id} onClick={() => setHistorialFor(it)} style={{ cursor: 'pointer' }} title="Ver historial">
                    <td style={{ fontWeight: 600 }}>{it.cliente_nombre}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {it.tipo_tramite || '—'}{it.decreto && ` · ${it.decreto}`}
                      {it.etapa_actual && <div style={{ fontSize: 11 }}>Plan Gradual — {it.etapa_actual}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{formatFecha(it.vencimiento)}</span>
                        <span className={`badge ${b.cls}`}>{b.label}</span>
                      </div>
                    </td>
                    <td>{it.estado ? <span className={`badge ${estadoBomberosBadgeClass(it.estado)}`}>{it.estado}</span> : '—'}</td>
                    <td>{it.empresa || '—'}</td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <DocsClip count={it.docsCount} onClick={() => setDocsFor(it)} />
                        <ActionsMenu actions={[
                          { label: 'Ver historial', icon: <History size={14} />, onClick: () => setHistorialFor(it) },
                          { label: 'Reclamos', icon: <MessageSquareWarning size={14} />, onClick: () => setReclamosFor(it) },
                          { label: 'Nuevo trámite', icon: <RotateCw size={14} />, onClick: () => abrirNuevaGestion(it) },
                          { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(it) },
                          { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setConfirmEliminar(it), danger: true },
                        ]} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="mobile-list" style={{ display: 'none' }}>
            {paginados.map(it => {
              const b = vencBadge(it.dias)
              return (
                <div key={it.id} onClick={() => setHistorialFor(it)} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{it.cliente_nombre}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                      <DocsClip count={it.docsCount} onClick={() => setDocsFor(it)} />
                      <ActionsMenu actions={[
                        { label: 'Ver historial', icon: <History size={14} />, onClick: () => setHistorialFor(it) },
                        { label: 'Reclamos', icon: <MessageSquareWarning size={14} />, onClick: () => setReclamosFor(it) },
                        { label: 'Nuevo trámite', icon: <RotateCw size={14} />, onClick: () => abrirNuevaGestion(it) },
                        { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(it) },
                        { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setConfirmEliminar(it), danger: true },
                      ]} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {it.estado && <span className={`badge ${estadoBomberosBadgeClass(it.estado)}`} style={{ marginRight: 6 }}>{it.estado}</span>}
                    {it.tipo_tramite}{it.tipo_tramite && ' · '}{it.empresa}{it.empresa && ' · '}{formatFecha(it.vencimiento)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Pagination page={page} total={filtrados.length} onChange={setPage} />

      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>{paso === 'cliente' ? 'Seleccionar edificio' : 'Nuevo trámite de habilitación'}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Paso {paso === 'cliente' ? '1' : '2'} de 2</div>
                {paso === 'gestion' && clienteLocked && (
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', marginTop: 6, lineHeight: 1.2 }}>{clienteLocked.nombre}</div>
                )}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente', 'gestion'].map((p, i) => {
                const idx = ['cliente', 'gestion'].indexOf(paso)
                return <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= idx ? 'var(--gold)' : 'var(--border)', transition: 'background .2s' }} />
              })}
            </div>

            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar edificio..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteLocked(c); setForm((p: any) => ({ ...p, cliente_id: c.id })); setPaso('gestion') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.direccion}</div>}
                      </div>
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin edificios</div>
                  )}
                </div>
              </>
            )}

            {paso === 'gestion' && (
              <>
                <BomberosForm form={form} setForm={setForm} clientes={clientes} clienteLocked={clienteLocked} empresas={empresas} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar edificio</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                    <button className="btn-primary" onClick={guardar} disabled={saving || !form.cliente_id}>
                      {saving ? <><Loader2 size={14} /> Guardando...</> : 'Guardar'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar trámite</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <BomberosForm form={editForm} setForm={setEditForm} clientes={clientes} clienteLocked={null} empresas={empresas} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => { setConfirmEliminar(editando); setEditando(null) }}>
                <Trash2 size={14} /> Eliminar
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
                <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit || !editForm.cliente_id}>
                  {savingEdit ? <><Loader2 size={14} /> Guardando...</> : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmEliminar && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminando) setConfirmEliminar(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar este registro?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                Se va a eliminar el trámite de <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar.cliente_nombre}</strong> y sus documentos adjuntos. Esta acción no se puede deshacer.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminar(null)} disabled={eliminando}>Cancelar</button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : <><Trash2 size={14} /> Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {docsFor && (
        <MantDocumentos
          tabla="mant_bomberos"
          registroId={docsFor.id}
          clienteNombre={docsFor.cliente_nombre}
          tiposSugeridos={DOCS_TIPOS_BOMBEROS}
          onClose={() => setDocsFor(null)}
        />
      )}

      {reclamosFor && (
        <MantReclamos
          tabla="mant_bomberos"
          registroId={reclamosFor.id}
          clienteNombre={reclamosFor.cliente_nombre}
          onClose={() => setReclamosFor(null)}
        />
      )}

      {historialFor && historialFor.cliente_id && (
        <MantHistorial
          tabla="mant_bomberos"
          clienteId={historialFor.cliente_id}
          clienteNombre={historialFor.cliente_nombre}
          onClose={() => setHistorialFor(null)}
          onChanged={fetchAll}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function DocsClip({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      title={count > 0 ? `${count} documento${count > 1 ? 's' : ''} adjunto${count > 1 ? 's' : ''}` : 'Sin documentos — click para adjuntar'}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
        color: count > 0 ? 'var(--gold)' : 'var(--text-muted)', padding: '4px 6px',
        display: 'inline-flex', alignItems: 'center', borderRadius: 6, opacity: count > 0 ? 1 : 0.55,
      }}
    >
      <Paperclip size={15} fill={count > 0 ? 'currentColor' : 'none'} fillOpacity={count > 0 ? 0.15 : 0} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -1, right: -1, background: 'var(--gold)', color: 'var(--navy)',
          fontSize: 9, fontWeight: 800, borderRadius: 8, minWidth: 13, height: 13, lineHeight: '13px',
          textAlign: 'center', padding: '0 2px',
        }}>{count}</span>
      )}
    </button>
  )
}

export function BomberosForm({ form, setForm, clientes, clienteLocked, empresas }: { form: typeof emptyForm; setForm: (f: any) => void; clientes: ClienteOpt[]; clienteLocked: ClienteOpt | null; empresas: string[] }) {
  const esPlanGradual = form.tipo_tramite === 'PG'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Edificio / cliente *</label>
        {clienteLocked ? (
          <div style={{ padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: 'var(--bg-card-alt)', fontWeight: 600 }}>
            {clienteLocked.nombre}
          </div>
        ) : (
          <select value={form.cliente_id} onChange={e => setForm((p: any) => ({ ...p, cliente_id: e.target.value }))} autoFocus>
            <option value="">Seleccionar edificio...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
      </div>

      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Tipo de trámite</label>
        <select value={form.tipo_tramite} onChange={e => {
          const v = e.target.value
          // La clasificación PTC/PT/PG/etc. es propia del Decreto 372/023 (Art. 11) — los decretos
          // anteriores no la usaban. Si se elige un tipo de trámite, el decreto queda fijo en 372/023.
          setForm((p: any) => ({ ...p, tipo_tramite: v, decreto: v ? '372/023' : p.decreto }))
        }}>
          <option value="">— Sin clasificar (habilitación bajo normativa anterior) —</option>
          {TIPOS_TRAMITE_BOMBEROS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {form.tipo_tramite && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.4, background: 'var(--bg-card-alt)', borderRadius: 7, padding: '7px 10px' }}>
            {TIPOS_TRAMITE_BOMBEROS.find(t => t.value === form.tipo_tramite)?.descripcion}
          </div>
        )}
      </div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Decreto</label>
        <select value={form.decreto} disabled={!!form.tipo_tramite}
          onChange={e => setForm((p: any) => ({ ...p, decreto: e.target.value }))}
          style={form.tipo_tramite ? { background: 'var(--bg-card-alt)', color: 'var(--text-muted)', cursor: 'not-allowed' } : undefined}>
          {DECRETOS_BOMBEROS.map(d => <option key={d} value={d}>{d === 'Otro / sin datos' ? d : `Decreto ${d}`}</option>)}
        </select>
        {form.tipo_tramite ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Fijo en 372/023: esa clasificación de trámite no existía en los decretos anteriores.
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Elegí un decreto anterior solo si es una habilitación vieja todavía vigente y sin reclasificar.
          </div>
        )}
      </div>

      <div className="fgroup"><label>Fecha de certificación</label>
        <DatePicker value={form.fecha_certificacion} onChange={v => setForm((p: any) => ({
          ...p,
          fecha_certificacion: v,
          vencimiento: v ? sumarAnios(v, 4) : p.vencimiento,
        }))} placeholder="¿Cuándo se certificó?" /></div>
      <div className="fgroup"><label>Vencimiento de la habilitación</label>
        <DatePicker value={form.vencimiento} onChange={v => setForm((p: any) => ({ ...p, vencimiento: v }))} placeholder="Próxima fecha" />
        {form.fecha_certificacion && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Se calcula solo (+4 años, el máximo) — se puede ajustar si la DNB otorgó menos</div>}
      </div>

      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={esPlanGradual} onChange={e => setForm((p: any) => ({ ...p, tipo_tramite: e.target.checked ? 'PG' : '', decreto: e.target.checked ? '372/023' : p.decreto }))} style={{ width: 'auto' }} />
          Está en Plan Gradual (edificios existentes, Art. 19 Decreto 372/023)
        </label>
      </div>
      {esPlanGradual && (
        <>
          <div className="fgroup"><label style={{ fontSize: 12 }}>Etapa actual</label>
            <select value={form.etapa_actual} onChange={e => setForm((p: any) => ({ ...p, etapa_actual: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {ETAPAS_PLAN_GRADUAL.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div />
          <div className="fgroup"><label style={{ fontSize: 12 }}>C1 — 90 días (extintores, señalización, evacuación)</label>
            <DatePicker value={form.fecha_c1} onChange={v => setForm((p: any) => ({ ...p, fecha_c1: v, fecha_c2: p.fecha_c2 || (v ? sumarAnios(v, 1) : ''), fecha_c3: p.fecha_c3 || (v ? sumarAnios(v, 3) : '') }))} placeholder="Fecha límite C1" /></div>
          <div className="fgroup"><label style={{ fontSize: 12 }}>C2 — 1 año desde C1 (detección/alarma)</label>
            <DatePicker value={form.fecha_c2} onChange={v => setForm((p: any) => ({ ...p, fecha_c2: v }))} placeholder="Fecha límite C2" /></div>
          <div className="fgroup"><label style={{ fontSize: 12 }}>C3 — 3 años desde C1 (obras mayores)</label>
            <DatePicker value={form.fecha_c3} onChange={v => setForm((p: any) => ({ ...p, fecha_c3: v }))} placeholder="Fecha límite C3" /></div>
        </>
      )}

      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Técnico registrado (DNB)</label>
        <input value={form.tecnico_registrado} onChange={e => setForm((p: any) => ({ ...p, tecnico_registrado: e.target.value }))} placeholder="Nombre del técnico o estudio" />
      </div>

      <div className="fgroup"><label>Empresa</label>
        <select value={form.empresa} onChange={e => setForm((p: any) => ({ ...p, empresa: e.target.value }))} style={{ color: form.empresa ? 'var(--navy)' : 'var(--slate)' }}>
          <option value="">— Seleccionar —</option>
          {empresas.map(e => <option key={e} value={e}>{e}</option>)}
          {form.empresa && !empresas.includes(form.empresa) && <option value={form.empresa}>{form.empresa}</option>}
        </select>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Se administran desde Configuración</div>
      </div>
      <div className="fgroup"><label>Costo (opcional)</label>
        <input type="number" min={0} value={form.costo} onChange={e => setForm((p: any) => ({ ...p, costo: parseFloat(e.target.value) || 0 }))} placeholder="0" />
      </div>

      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Estado</label>
        <select value={form.estado} onChange={e => setForm((p: any) => ({ ...p, estado: e.target.value }))}>
          {ESTADOS_BOMBEROS.map(es => <option key={es} value={es}>{es}</option>)}
        </select>
      </div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Comentarios</label>
        <textarea value={form.comentarios} onChange={e => setForm((p: any) => ({ ...p, comentarios: e.target.value }))} rows={2}
          style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', resize: 'vertical' }} /></div>
      <div style={{ gridColumn: 'span 2', fontSize: 11.5, color: 'var(--text-muted)' }}>
        Los reclamos se cargan aparte, con fecha, desde el menú "···" de cada registro.
      </div>
    </div>
  )
}
