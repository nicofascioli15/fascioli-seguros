'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
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
import { ACCION, ACCION_TITULO, ESTADOS_GESTION, estadoBadgeClass, sumarAnios, VENCIMIENTO_ANIOS, VENCIMIENTO_ENSAYO_ANIOS, TIPOS_EXTINTOR, EXTRAS_EXTINTORES, detalleGestionTexto } from '@/lib/mantenimientoConfig'

type Item = {
  id: string
  cliente_id: string | null
  cliente_nombre: string
  fecha_servicio: string | null
  vencimiento: string | null
  empresa: string
  estado: string
  comentarios: string
  created_at: string
  dias: number | null
  vigente: boolean
  docsCount: number
  cant_co2: number
  cant_8kg: number
  cant_4kg: number
  cant_espuma: number
  cant_ensayo_hidrostatico: number
  vencimiento_ensayo: string | null
  extras: Record<string, number>
  dias_ensayo: number | null
}
type ClienteOpt = { id: string; nombre: string; direccion?: string }

type Props = {
  tabla: 'mant_extintores' | 'mant_tanques'
  titulo: string
  singular: string
}

const DOCS_TIPOS: Record<Props['tabla'], string[]> = {
  mant_extintores: ['Certificado de recarga', 'Foto', 'Otro'],
  mant_tanques: ['Análisis de potabilidad', 'Certificado de limpieza', 'Foto', 'Otro'],
}

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
  if (dias <= 7) return { label: `${dias}d`, cls: 'badge-danger' }
  if (dias <= 30) return { label: `${dias}d`, cls: 'badge-warning' }
  return { label: `${dias}d`, cls: 'badge-success' }
}

export const emptyForm = {
  cliente_id: '', fecha_servicio: '', vencimiento: '', empresa: '', estado: 'No realizado', comentarios: '',
  cant_co2: 0, cant_8kg: 0, cant_4kg: 0, cant_espuma: 0,
  cant_ensayo_hidrostatico: 0, vencimiento_ensayo: '',
  extras: {} as Record<string, number>,
}

export default function MantItemsPage({ tabla, titulo, singular }: Props) {
  const supabase = createClient()

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
  const [exportScope, setExportScope] = useState<'vigentes' | 'completados' | 'historial'>('vigentes')

  useEffect(() => { fetchAll() }, [tabla])

  async function fetchAll() {
    setLoading(true)
    const baseCols  = 'id, cliente_id, fecha_servicio, vencimiento, empresa, estado, comentarios, created_at'
    const extraCols = tabla === 'mant_extintores' ? ', cant_co2, cant_8kg, cant_4kg, cant_espuma, cant_ensayo_hidrostatico, vencimiento_ensayo, extras' : ''
    const [{ data: itemsData }, { data: clientesData }, { data: empresasData }] = await Promise.all([
      supabase.from(tabla).select(`${baseCols}${extraCols}, mant_clientes(nombre)`).order('vencimiento', { ascending: true, nullsFirst: false }),
      supabase.from('mant_clientes').select('id, nombre, direccion').order('nombre'),
      supabase.from('mant_empresas').select('nombre').order('nombre'),
    ])
    if (empresasData) setEmpresas(empresasData.map((e: any) => e.nombre))
    if (itemsData) {
      const mapped: Item[] = itemsData.map((r: any) => ({
        id: r.id,
        cliente_id: r.cliente_id,
        cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar',
        fecha_servicio: r.fecha_servicio,
        vencimiento: r.vencimiento,
        empresa: r.empresa || '',
        estado: r.estado || '',
        comentarios: r.comentarios || '',
        created_at: r.created_at,
        dias: diasHasta(r.vencimiento),
        vigente: false,
        docsCount: 0,
        cant_co2: r.cant_co2 || 0,
        cant_8kg: r.cant_8kg || 0,
        cant_4kg: r.cant_4kg || 0,
        cant_espuma: r.cant_espuma || 0,
        cant_ensayo_hidrostatico: r.cant_ensayo_hidrostatico || 0,
        vencimiento_ensayo: r.vencimiento_ensayo || null,
        extras: r.extras || {},
        dias_ensayo: diasHasta(r.vencimiento_ensayo || null),
      }))
      // Vigente = gestión más reciente por edificio (fecha de servicio, si no hay, fecha de alta)
      const porCliente: Record<string, Item[]> = {}
      mapped.forEach(it => { if (it.cliente_id) (porCliente[it.cliente_id] ||= []).push(it) })
      Object.values(porCliente).forEach(arr => {
        const masReciente = [...arr].sort((a, b) => (b.fecha_servicio || b.created_at || '').localeCompare(a.fecha_servicio || a.created_at || ''))[0]
        if (masReciente) masReciente.vigente = true
      })

      // Conteo de documentos adjuntos por registro
      const fkCol = tabla === 'mant_extintores' ? 'extintor_id' : 'tanque_id'
      const ids = mapped.map(it => it.id)
      if (ids.length > 0) {
        const { data: docsData } = await supabase.from('mant_documentos').select(fkCol).in(fkCol, ids)
        const counts: Record<string, number> = {}
        ;(docsData || []).forEach((d: any) => { const k = d[fkCol]; if (k) counts[k] = (counts[k] || 0) + 1 })
        mapped.forEach(it => { it.docsCount = counts[it.id] || 0 })
      }

      setItems(mapped)
    }
    if (clientesData) setClientes(clientesData)
    setLoading(false)
  }

  async function guardar() {
    if (!form.cliente_id) return
    setSaving(true)
    const payload: any = {
      cliente_id: form.cliente_id,
      fecha_servicio: form.fecha_servicio || null,
      vencimiento: form.vencimiento || null,
      empresa: form.empresa || null,
      estado: form.estado || null,
      comentarios: form.comentarios || null,
    }
    if (tabla === 'mant_extintores') {
      payload.cant_co2 = form.cant_co2 || 0
      payload.cant_8kg = form.cant_8kg || 0
      payload.cant_4kg = form.cant_4kg || 0
      payload.cant_espuma = form.cant_espuma || 0
      payload.cant_ensayo_hidrostatico = form.cant_ensayo_hidrostatico || 0
      payload.vencimiento_ensayo = form.vencimiento_ensayo || null
      payload.extras = form.extras || {}
    }
    const { error, data } = await supabase.from(tabla).insert([payload]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla, registroId: data.id, descripcion: `${singular} — nueva gestión`, datosDespues: data })
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
      fecha_servicio: it.fecha_servicio || '',
      vencimiento: it.vencimiento || '',
      empresa: it.empresa,
      estado: it.estado,
      comentarios: it.comentarios,
      cant_co2: it.cant_co2 || 0,
      cant_8kg: it.cant_8kg || 0,
      cant_4kg: it.cant_4kg || 0,
      cant_espuma: it.cant_espuma || 0,
      cant_ensayo_hidrostatico: it.cant_ensayo_hidrostatico || 0,
      vencimiento_ensayo: it.vencimiento_ensayo || '',
      extras: it.extras || {},
    })
  }

  function abrirNuevaGestion(it: Item) {
    setForm({ ...emptyForm, cliente_id: it.cliente_id || '', empresa: it.empresa })
    setClienteLocked({ id: it.cliente_id || '', nombre: it.cliente_nombre })
    setPaso('gestion')
    setShowModal(true)
  }

  async function guardarEdicion() {
    if (!editando || !editForm.cliente_id) return
    setSavingEdit(true)
    const payload: any = {
      cliente_id: editForm.cliente_id,
      fecha_servicio: editForm.fecha_servicio || null,
      vencimiento: editForm.vencimiento || null,
      empresa: editForm.empresa || null,
      estado: editForm.estado || null,
      comentarios: editForm.comentarios || null,
    }
    if (tabla === 'mant_extintores') {
      payload.cant_co2 = editForm.cant_co2 || 0
      payload.cant_8kg = editForm.cant_8kg || 0
      payload.cant_4kg = editForm.cant_4kg || 0
      payload.cant_espuma = editForm.cant_espuma || 0
      payload.cant_ensayo_hidrostatico = editForm.cant_ensayo_hidrostatico || 0
      payload.vencimiento_ensayo = editForm.vencimiento_ensayo || null
      payload.extras = editForm.extras || {}
    }
    await supabase.from(tabla).update(payload).eq('id', editando.id)
    await registrarAudit({ accion: 'editar', tabla, registroId: editando.id, descripcion: `${singular} editado`, datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchAll()
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await supabase.from(tabla).delete().eq('id', confirmEliminar.id)
    await registrarAudit({ accion: 'eliminar', tabla, registroId: confirmEliminar.id, descripcion: `${singular} eliminado` })
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchAll()
  }

  const estadosDisponibles = Array.from(new Set([...ESTADOS_GESTION, ...items.map(i => i.estado).filter(Boolean)]))

  const filtradosBase = items.filter(it => {
    if (!it.vigente) return false
    const q = search.toLowerCase()
    const matchQ = !q || it.cliente_nombre.toLowerCase().includes(q) || it.empresa.toLowerCase().includes(q) || it.comentarios.toLowerCase().includes(q)
    const matchDias = filtroDias === -1 ? true : filtroDias === 0 ? (it.dias !== null && it.dias < 0) : (it.dias !== null && it.dias >= 0 && it.dias <= filtroDias)
    const matchEstado = !filtroEstado || it.estado === filtroEstado
    return matchQ && matchDias && matchEstado
  })
  const { sort, toggleSort, sorted: filtrados } = useSortFilter<Item>(filtradosBase)
  const paginados = paginate(filtrados, page) as Item[]
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  const EXPORT_SCOPES: { value: typeof exportScope; label: string }[] = [
    { value: 'vigentes',   label: 'Vigentes (todos los estados)' },
    { value: 'completados', label: 'Vigentes completados' },
    { value: 'historial',  label: 'Historial completo (todas las gestiones)' },
  ]
  const itemsExport = (() => {
    const q = search.toLowerCase()
    const matchQ = (it: Item) => !q || it.cliente_nombre.toLowerCase().includes(q) || it.empresa.toLowerCase().includes(q) || it.comentarios.toLowerCase().includes(q)
    let base = items.filter(matchQ)
    if (exportScope === 'vigentes') base = base.filter(it => it.vigente)
    else if (exportScope === 'completados') base = base.filter(it => it.vigente && it.estado === 'Completado')
    return [...base].sort((a, b) => {
      const byCliente = a.cliente_nombre.localeCompare(b.cliente_nombre)
      if (byCliente !== 0) return byCliente
      return (b.fecha_servicio || b.created_at || '').localeCompare(a.fecha_servicio || a.created_at || '')
    })
  })()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>{titulo}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {items.filter(i => i.vigente).length} edificios con seguimiento
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={exportScope} onChange={e => setExportScope(e.target.value as typeof exportScope)}
            style={{ padding: '9px 10px', border: '1.5px solid var(--border)', borderRadius: 9, fontSize: 12.5, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)' }}>
            {EXPORT_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <ExportButton
            titulo={`${titulo} — ${EXPORT_SCOPES.find(s => s.value === exportScope)?.label}`}
            subtitulo={`${itemsExport.length} registros`}
            columnas={[
              { header: 'Edificio', key: 'edificio', width: 110 },
              ...(exportScope === 'historial' ? [{ header: 'Vigente', key: 'vigente', width: 40 }] : []),
              { header: 'Fecha servicio', key: 'fecha_servicio', width: 62 },
              { header: 'Vencimiento', key: 'vencimiento', width: 62 },
              { header: 'Estado', key: 'estado', width: 75 },
              { header: 'Empresa', key: 'empresa', width: 80 },
              ...(tabla === 'mant_extintores' ? [{ header: 'Detalle', key: 'detalle' }] : []),
              { header: 'Comentarios', key: 'comentarios' },
            ]}
            filas={itemsExport.map(it => ({
              edificio: it.cliente_nombre,
              vigente: it.vigente ? 'Sí' : '—',
              fecha_servicio: formatFecha(it.fecha_servicio),
              vencimiento: formatFecha(it.vencimiento),
              estado: it.estado || '—',
              empresa: it.empresa || '—',
              detalle: tabla === 'mant_extintores' ? (detalleGestionTexto(tabla, it) || '—') : undefined,
              comentarios: it.comentarios || '—',
            }))}
            filename={`${tabla}-${exportScope}-fascioli`}
          />
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setClienteLocked(null); setClienteSearch(''); setPaso('cliente'); setShowModal(true) }}>
            <Plus size={15} /> Nueva {ACCION[tabla]}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar edificio, empresa..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 260, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ l: '30 días', v: 30 }, { l: '90 días', v: 90 }, { l: 'Vencidos', v: 0 }, { l: 'Todos', v: -1 }].map(t =>
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
          <div style={{ fontSize: 12 }}>{items.length === 0 ? `Registrá la primera ${ACCION[tabla]} arriba` : 'Probá cambiando los filtros'}</div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <SortHeader label="Edificio" col="cliente_nombre" sort={sort} onSort={toggleSort} />
                <SortHeader label="Vencimiento" col="vencimiento" sort={sort} onSort={toggleSort} />
                {tabla === 'mant_extintores' && <th>Cant.</th>}
                {tabla === 'mant_extintores' && <th>Ensayo hidrostático</th>}
                <th>Estado</th>
                <th>Empresa</th>
                <th>Comentarios</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(it => {
                const b = vencBadge(it.dias)
                return (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.cliente_nombre}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{formatFecha(it.vencimiento)}</span>
                        <span className={`badge ${b.cls}`}>{b.label}</span>
                      </div>
                    </td>
                    {tabla === 'mant_extintores' && (
                      <td style={{ color: 'var(--text-muted)' }}>
                        {it.cant_co2 + it.cant_8kg + it.cant_4kg + it.cant_espuma || '—'}
                      </td>
                    )}
                    {tabla === 'mant_extintores' && (
                      <td>
                        {it.vencimiento_ensayo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{formatFecha(it.vencimiento_ensayo)}</span>
                            <span className={`badge ${vencBadge(it.dias_ensayo).cls}`}>{vencBadge(it.dias_ensayo).label}</span>
                          </div>
                        ) : '—'}
                      </td>
                    )}
                    <td>{it.estado ? <span className={`badge ${estadoBadgeClass(it.estado)}`}>{it.estado}</span> : '—'}</td>
                    <td>{it.empresa || '—'}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }} title={it.comentarios}>{it.comentarios || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <DocsClip count={it.docsCount} onClick={() => setDocsFor(it)} />
                        <ActionsMenu actions={[
                          { label: 'Ver historial', icon: <History size={14} />, onClick: () => setHistorialFor(it) },
                          { label: 'Reclamos', icon: <MessageSquareWarning size={14} />, onClick: () => setReclamosFor(it) },
                          { label: `Nueva ${ACCION[tabla]}`, icon: <RotateCw size={14} />, onClick: () => abrirNuevaGestion(it) },
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
                <div key={it.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{it.cliente_nombre}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                      <DocsClip count={it.docsCount} onClick={() => setDocsFor(it)} />
                      <ActionsMenu actions={[
                        { label: 'Ver historial', icon: <History size={14} />, onClick: () => setHistorialFor(it) },
                        { label: 'Reclamos', icon: <MessageSquareWarning size={14} />, onClick: () => setReclamosFor(it) },
                        { label: `Nueva ${ACCION[tabla]}`, icon: <RotateCw size={14} />, onClick: () => abrirNuevaGestion(it) },
                        { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(it) },
                        { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setConfirmEliminar(it), danger: true },
                      ]} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {it.estado && <span className={`badge ${estadoBadgeClass(it.estado)}`} style={{ marginRight: 6 }}>{it.estado}</span>}
                    {it.empresa}{it.empresa && ' · '}{formatFecha(it.vencimiento)}
                  </div>
                  {tabla === 'mant_extintores' && it.vencimiento_ensayo && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      Ensayo hidrostático: {formatFecha(it.vencimiento_ensayo)}
                      <span className={`badge ${vencBadge(it.dias_ensayo).cls}`}>{vencBadge(it.dias_ensayo).label}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Pagination page={page} total={filtrados.length} onChange={setPage} />

      {/* Modal nuevo / nueva gestión */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>{paso === 'cliente' ? 'Seleccionar edificio' : ACCION_TITULO[tabla]}</h3>
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
                <ItemForm form={form} setForm={setForm} clientes={clientes} clienteLocked={clienteLocked} tabla={tabla} empresas={empresas} />
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

      {/* Modal editar */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar {singular}</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <ItemForm form={editForm} setForm={setEditForm} clientes={clientes} clienteLocked={null} tabla={tabla} empresas={empresas} />
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

      {/* Modal confirmar eliminar */}
      {confirmEliminar && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminando) setConfirmEliminar(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar este registro?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                Se va a eliminar el registro de <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar.cliente_nombre}</strong> y sus documentos adjuntos. Esta acción no se puede deshacer.
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

      {/* Modal documentos */}
      {docsFor && (
        <MantDocumentos
          tabla={tabla}
          registroId={docsFor.id}
          clienteNombre={docsFor.cliente_nombre}
          tiposSugeridos={DOCS_TIPOS[tabla]}
          onClose={() => setDocsFor(null)}
        />
      )}

      {/* Modal reclamos */}
      {reclamosFor && (
        <MantReclamos
          tabla={tabla}
          registroId={reclamosFor.id}
          clienteNombre={reclamosFor.cliente_nombre}
          onClose={() => setReclamosFor(null)}
        />
      )}

      {/* Modal historial */}
      {historialFor && historialFor.cliente_id && (
        <MantHistorial
          tabla={tabla}
          clienteId={historialFor.cliente_id}
          clienteNombre={historialFor.cliente_nombre}
          onClose={() => setHistorialFor(null)}
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

export function ItemForm({ form, setForm, clientes, clienteLocked, tabla, empresas }: { form: typeof emptyForm; setForm: (f: any) => void; clientes: ClienteOpt[]; clienteLocked: ClienteOpt | null; tabla: 'mant_extintores' | 'mant_tanques'; empresas: string[] }) {
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
      <div className="fgroup"><label>Fecha del servicio</label>
        <DatePicker value={form.fecha_servicio} onChange={v => setForm((p: any) => ({
          ...p,
          fecha_servicio: v,
          vencimiento: v ? sumarAnios(v, VENCIMIENTO_ANIOS[tabla]) : p.vencimiento,
          vencimiento_ensayo: v && tabla === 'mant_extintores' ? sumarAnios(v, VENCIMIENTO_ENSAYO_ANIOS) : p.vencimiento_ensayo,
        }))} placeholder="¿Cuándo se hizo?" /></div>
      <div className="fgroup"><label>Próximo vencimiento</label>
        <DatePicker value={form.vencimiento} onChange={v => setForm((p: any) => ({ ...p, vencimiento: v }))} placeholder="Próxima fecha" />
        {form.fecha_servicio && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Se calcula solo (+{VENCIMIENTO_ANIOS[tabla]} {VENCIMIENTO_ANIOS[tabla] === 1 ? 'año' : 'años'}) — se puede ajustar</div>}
      </div>

      {tabla === 'mant_extintores' && (
        <>
          <div className="fgroup" style={{ gridColumn: 'span 2', marginBottom: -4 }}>
            <label style={{ fontSize: 12 }}>Extintores recargados por tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {TIPOS_EXTINTOR.map(t => (
                <div key={t.key}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 2 }}>{t.label}</div>
                  <input type="number" min={0} value={form[t.key]}
                    onChange={e => setForm((p: any) => ({ ...p, [t.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Total: {form.cant_co2 + form.cant_8kg + form.cant_4kg + form.cant_espuma}
            </div>
          </div>

          <div className="fgroup" style={{ gridColumn: 'span 2', marginBottom: -4 }}>
            <label style={{ fontSize: 12 }}>Extras</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {EXTRAS_EXTINTORES.map(ex => (
                <div key={ex.key}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 2 }}>{ex.label}</div>
                  <input type="number" min={0} value={form.extras[ex.key] || 0}
                    onChange={e => { const val = Math.max(0, parseInt(e.target.value) || 0); setForm((p: any) => ({ ...p, extras: { ...p.extras, [ex.key]: val } })) }}
                    style={{ width: '100%', padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>

          <div className="fgroup"><label style={{ fontSize: 12 }}>Ensayos hidrostáticos realizados</label>
            <input type="number" min={0} value={form.cant_ensayo_hidrostatico}
              onChange={e => setForm((p: any) => ({ ...p, cant_ensayo_hidrostatico: Math.max(0, parseInt(e.target.value) || 0) }))}
              placeholder="0" /></div>
          <div className="fgroup"><label style={{ fontSize: 12 }}>Próximo ensayo hidrostático</label>
            <DatePicker value={form.vencimiento_ensayo} onChange={v => setForm((p: any) => ({ ...p, vencimiento_ensayo: v }))} placeholder="+4 años" />
          </div>
        </>
      )}

      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Empresa</label>
        <select value={form.empresa} onChange={e => setForm((p: any) => ({ ...p, empresa: e.target.value }))} style={{ color: form.empresa ? 'var(--navy)' : 'var(--slate)' }}>
          <option value="">— Seleccionar —</option>
          {empresas.map(e => <option key={e} value={e}>{e}</option>)}
          {form.empresa && !empresas.includes(form.empresa) && <option value={form.empresa}>{form.empresa}</option>}
        </select>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Se administran desde Configuración</div>
      </div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Estado</label>
        <select value={form.estado} onChange={e => setForm((p: any) => ({ ...p, estado: e.target.value }))}>
          {ESTADOS_GESTION.map(es => <option key={es} value={es}>{es}</option>)}
        </select>
      </div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Comentarios</label>
        <textarea value={form.comentarios} onChange={e => setForm((p: any) => ({ ...p, comentarios: e.target.value }))} rows={2}
          style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', resize: 'vertical' }} /></div>
      <div style={{ gridColumn: 'span 2', fontSize: 11.5, color: 'var(--text-muted)' }}>
        Los reclamos ahora se cargan aparte, con fecha, desde el menú "···" de cada registro.
      </div>
    </div>
  )
}
