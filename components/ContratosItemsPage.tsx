'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, type ReactNode } from 'react'
import { Search, Plus, X, Loader2, Pencil, Trash2, AlertTriangle, Paperclip, Check, RotateCw } from 'lucide-react'
import { useSortFilter } from '@/hooks/useSortFilter'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import ExportButton from '@/components/ExportButton'
import { Pagination, paginate } from '@/components/Pagination'
import { SortHeader } from '@/components/SortHeader'
import DatePicker from '@/components/DatePicker'
import ActionsMenu from '@/components/ActionsMenu'
import ContratosDocumentos from '@/components/ContratosDocumentos'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  TipoCategoria, docsTipos, hoyISO, formatFecha, formatDias, diasHasta, garantiaMesesDesde, garantiaValorEnUnidad, UnidadGarantia,
  calcularAuto, estadoAutoBadge, calcularObra, estadoObraBadge, prioridadEstado,
} from '@/lib/contratosConfig'

type ClienteOpt = { id: string; nombre: string; direccion?: string }

type Row = {
  id: string
  cliente_id: string | null
  cliente_nombre: string
  tipo_contrato: string
  empresa: string
  fecha_firma_inicio: string | null
  vigencia_anios: number | null
  fecha_fin: string | null
  garantia_meses: number | null
  garantia_unidad: UnidadGarantia
  renovado: boolean
  nota: string
  created_at: string
  docsCount: number
  // Calculados
  dias: number | null
  estadoLabel: string
  estadoCls: string
  proximoVenc: string | null
  autoRenovado: boolean
  inicioCiclo: string | null
}

export const emptyForm = {
  cliente_id: '', tipo_contrato: '', empresa: '', fecha_firma_inicio: '', vigencia_anios: 1,
  fecha_fin: '', garantia_valor: 12, garantia_unidad: 'meses' as UnidadGarantia, nota: '',
}

function calcularFila(r: any, tipo: TipoCategoria, hoy: string): Row {
  if (tipo === 'auto') {
    const calc = calcularAuto(r.fecha_firma_inicio, r.vigencia_anios, hoy)
    const badge = estadoAutoBadge(calc?.estado || null, r.renovado)
    return {
      ...r, cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar', docsCount: 0,
      dias: calc?.dias ?? null, estadoLabel: badge.label, estadoCls: badge.cls,
      proximoVenc: calc?.vencimiento ?? null,
      autoRenovado: !r.renovado && (calc?.autoRenovado ?? false), inicioCiclo: calc?.inicioCiclo ?? null,
    }
  }
  const calc = calcularObra(r.fecha_fin, r.garantia_meses, hoy)
  const badge = estadoObraBadge(calc?.estado || null)
  return {
    ...r, cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar', docsCount: 0,
    dias: diasHasta(calc?.garantiaHasta ?? null), estadoLabel: badge.label, estadoCls: badge.cls,
    proximoVenc: calc?.garantiaHasta ?? null,
    autoRenovado: false, inicioCiclo: null,
  }
}

export default function ContratosItemsPage({ categoria, titulo, tipo }: { categoria: string; titulo: string; tipo: TipoCategoria }) {
  const supabase = createClient()
  const auto = tipo === 'auto'
  const hoy = hoyISO()

  const [rows, setRows]         = useState<Row[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [tipos, setTipos]       = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [page, setPage]         = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [paso, setPaso]           = useState<'cliente' | 'contrato'>('contrato')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteLocked, setClienteLocked] = useState<ClienteOpt | null>(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)

  const [editando, setEditando]   = useState<Row | null>(null)
  const [editForm, setEditForm]   = useState(emptyForm)
  const [savingEdit, setSavingEdit] = useState(false)

  const [confirmEliminar, setConfirmEliminar] = useState<Row | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const [renovarDe, setRenovarDe] = useState<Row | null>(null)
  const [renovarForm, setRenovarForm] = useState(emptyForm)
  const [renovando, setRenovando] = useState(false)

  const [docsFor, setDocsFor] = useState<Row | null>(null)
  const [detalle, setDetalle] = useState<Row | null>(null)

  useEffect(() => { fetchAll() }, [categoria])

  async function fetchAll() {
    setLoading(true)
    const [{ data: rowsData }, { data: clientesData }, { data: empresasData }, { data: tiposData }] = await Promise.all([
      supabase.from('contratos').select('id, cliente_id, tipo_contrato, empresa, fecha_firma_inicio, vigencia_anios, fecha_fin, garantia_meses, garantia_unidad, renovado, nota, created_at, mant_clientes(nombre)').eq('categoria', categoria).order('created_at', { ascending: false }),
      supabase.from('mant_clientes').select('id, nombre, direccion').order('nombre'),
      supabase.from('contratos_empresas').select('nombre').eq('categoria', categoria).order('nombre'),
      supabase.from('contratos_tipos').select('nombre').eq('categoria', categoria).order('nombre'),
    ])
    if (empresasData) setEmpresas(empresasData.map((e: any) => e.nombre))
    if (tiposData) setTipos(tiposData.map((t: any) => t.nombre))
    if (clientesData) setClientes(clientesData)
    if (rowsData) {
      const mapped = rowsData.map((r: any) => calcularFila(r, tipo, hoy))
      const ids = mapped.map(r => r.id)
      if (ids.length > 0) {
        const { data: docsData } = await supabase.from('contratos_documentos').select('contrato_id').in('contrato_id', ids)
        const counts: Record<string, number> = {}
        ;(docsData || []).forEach((d: any) => { if (d.contrato_id) counts[d.contrato_id] = (counts[d.contrato_id] || 0) + 1 })
        mapped.forEach(r => { r.docsCount = counts[r.id] || 0 })
      }
      setRows(mapped)
    }
    setLoading(false)
  }

  function payloadDe(f: typeof emptyForm) {
    const base: any = {
      categoria,
      cliente_id: f.cliente_id,
      tipo_contrato: f.tipo_contrato || null,
      empresa: f.empresa || null,
      nota: f.nota || null,
    }
    if (auto) {
      base.fecha_firma_inicio = f.fecha_firma_inicio || null
      base.vigencia_anios = f.vigencia_anios || null
      base.fecha_fin = null
      base.garantia_meses = null
      base.garantia_unidad = 'meses'
    } else {
      base.fecha_firma_inicio = f.fecha_firma_inicio || null
      base.fecha_fin = f.fecha_fin || null
      base.garantia_meses = garantiaMesesDesde(f.garantia_valor || 0, f.garantia_unidad)
      base.garantia_unidad = f.garantia_unidad
      base.vigencia_anios = null
    }
    return base
  }

  async function guardar() {
    if (!form.cliente_id) return
    setSaving(true)
    const payload = payloadDe(form)
    const { error, data } = await supabase.from('contratos').insert([payload]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'contratos', registroId: data.id, descripcion: `Contrato de ${titulo.toLowerCase()} creado`, datosDespues: data })
      setForm(emptyForm)
      setClienteLocked(null)
      setShowModal(false)
      await fetchAll()
    }
    setSaving(false)
  }

  function abrirEditar(r: Row) {
    setEditando(r)
    setEditForm({
      cliente_id: r.cliente_id || '', tipo_contrato: r.tipo_contrato || '', empresa: r.empresa || '',
      fecha_firma_inicio: r.fecha_firma_inicio || '', vigencia_anios: r.vigencia_anios || 1,
      fecha_fin: r.fecha_fin || '',
      garantia_valor: garantiaValorEnUnidad(r.garantia_meses || 12, r.garantia_unidad || 'meses'),
      garantia_unidad: r.garantia_unidad || 'meses',
      nota: r.nota || '',
    })
  }

  async function guardarEdicion() {
    if (!editando) return
    setSavingEdit(true)
    const payload = payloadDe(editForm)
    await supabase.from('contratos').update(payload).eq('id', editando.id)
    await registrarAudit({ accion: 'editar', tabla: 'contratos', registroId: editando.id, descripcion: 'Contrato editado', datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchAll()
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await supabase.from('contratos').delete().eq('id', confirmEliminar.id)
    await registrarAudit({ accion: 'eliminar', tabla: 'contratos', registroId: confirmEliminar.id, descripcion: 'Contrato eliminado' })
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchAll()
  }

  function abrirRenovar(r: Row) {
    setRenovarDe(r)
    setRenovarForm({ ...emptyForm, cliente_id: r.cliente_id || '', empresa: r.empresa || '', tipo_contrato: r.tipo_contrato || '', vigencia_anios: r.vigencia_anios || 1 })
  }

  async function confirmarRenovar() {
    if (!renovarDe || !renovarForm.fecha_firma_inicio) return
    setRenovando(true)
    const payload = payloadDe(renovarForm)
    const { error, data } = await supabase.from('contratos').insert([payload]).select().single()
    if (!error && data) {
      await supabase.from('contratos').update({ renovado: true }).eq('id', renovarDe.id)
      await registrarAudit({ accion: 'crear', tabla: 'contratos', registroId: data.id, descripcion: `Renovación de contrato de ${titulo.toLowerCase()} (reemplaza a ${renovarDe.id})`, datosDespues: data })
      setRenovarDe(null)
      await fetchAll()
    }
    setRenovando(false)
  }

  const estadosDisponibles = Array.from(new Set(rows.map(r => r.estadoLabel).filter(Boolean)))

  function matchFiltros(r: Row) {
    const q = search.toLowerCase()
    const matchQ = !q || r.cliente_nombre.toLowerCase().includes(q) || (r.empresa || '').toLowerCase().includes(q) || (r.tipo_contrato || '').toLowerCase().includes(q)
    const matchEstado = !filtroEstado || r.estadoLabel === filtroEstado
    return matchQ && matchEstado
  }

  // Orden base (antes de que el usuario elija una columna): a vencer primero, seguimiento, y lo resuelto al final.
  const filtradosBase = rows.filter(matchFiltros).sort((a, b) => prioridadEstado(a.estadoLabel) - prioridadEstado(b.estadoLabel))
  const { sort, toggleSort, sorted: filtrados } = useSortFilter<Row>(filtradosBase)
  const paginados = paginate(filtrados, page) as Row[]
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>{titulo}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{rows.length} contratos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ExportButton
            titulo={titulo}
            subtitulo={`${filtrados.length} contratos`}
            columnas={auto ? [
              { header: 'Edificio', key: 'edificio', width: 110 },
              { header: 'Empresa', key: 'empresa', width: 80 },
              { header: 'Tipo', key: 'tipo', width: 90 },
              { header: 'Firma', key: 'firma', width: 62 },
              { header: 'Vigencia', key: 'vigencia', width: 50 },
              { header: 'Próx. vencimiento', key: 'proximo', width: 65 },
              { header: 'Días', key: 'dias', width: 75 },
              { header: 'Estado', key: 'estado', width: 70 },
            ] : [
              { header: 'Edificio', key: 'edificio', width: 110 },
              { header: 'Empresa', key: 'empresa', width: 80 },
              { header: 'Tipo', key: 'tipo', width: 90 },
              { header: 'Inicio', key: 'firma', width: 62 },
              { header: 'Fin', key: 'fin', width: 62 },
              { header: 'Garantía hasta', key: 'proximo', width: 65 },
              { header: 'Días', key: 'dias', width: 75 },
              { header: 'Estado', key: 'estado', width: 70 },
            ]}
            filas={filtrados.map(r => ({
              edificio: r.cliente_nombre, empresa: r.empresa || '—', tipo: r.tipo_contrato || '—',
              firma: formatFecha(r.fecha_firma_inicio), vigencia: r.vigencia_anios ? `${r.vigencia_anios} años` : '—',
              fin: formatFecha(r.fecha_fin), proximo: formatFecha(r.proximoVenc), dias: formatDias(r.dias) || '—', estado: r.estadoLabel,
            }))}
            filename={`contratos-${categoria}-fascioli`}
          />
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setClienteLocked(null); setClienteSearch(''); setPaso('cliente'); setShowModal(true) }}>
            <Plus size={15} /> Nuevo contrato
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar edificio, empresa, tipo..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
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
          <div style={{ fontSize: 12 }}>{rows.length === 0 ? 'Registrá el primer contrato arriba' : 'Probá cambiando los filtros'}</div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <SortHeader label="Edificio" col="cliente_nombre" sort={sort} onSort={toggleSort} />
                <th>Empresa</th>
                <th>Tipo de contrato</th>
                {auto ? (
                  <>
                    <SortHeader label="Firma" col="fecha_firma_inicio" sort={sort} onSort={toggleSort} />
                    <th>Vigencia</th>
                    <SortHeader label="Próx. vencimiento" col="proximoVenc" sort={sort} onSort={toggleSort} />
                  </>
                ) : (
                  <>
                    <SortHeader label="Inicio" col="fecha_firma_inicio" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Fin" col="fecha_fin" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Garantía hasta" col="proximoVenc" sort={sort} onSort={toggleSort} />
                  </>
                )}
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setDetalle(r)}>
                  <td style={{ fontWeight: 600 }}>{r.cliente_nombre}</td>
                  <td>{r.empresa || '—'}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }} title={r.tipo_contrato}>{r.tipo_contrato || '—'}</td>
                  {auto ? (
                    <>
                      <td>{formatFecha(r.fecha_firma_inicio)}</td>
                      <td>{r.vigencia_anios ? `${r.vigencia_anios} ${r.vigencia_anios === 1 ? 'año' : 'años'}` : '—'}</td>
                      <td>
                        {formatFecha(r.proximoVenc)}
                        {r.dias !== null && <div style={{ fontSize: 11, color: r.dias <= 90 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: r.dias <= 90 ? 700 : 400, marginTop: 1 }}>{formatDias(r.dias)}</div>}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{formatFecha(r.fecha_firma_inicio)}</td>
                      <td>{formatFecha(r.fecha_fin)}</td>
                      <td>
                        {formatFecha(r.proximoVenc)}
                        {r.dias !== null && <div style={{ fontSize: 11, color: r.dias <= 90 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: r.dias <= 90 ? 700 : 400, marginTop: 1 }}>{formatDias(r.dias)}</div>}
                      </td>
                    </>
                  )}
                  <td>
                    <span className={`badge ${r.estadoCls}`}>{r.estadoLabel}</span>
                    {r.autoRenovado && (
                      <span className="badge badge-blue" style={{ marginLeft: 5 }} title={`Se renovó sola el ${formatFecha(r.inicioCiclo)} por no registrarse una renovación manual`}>Auto-renovado</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <DocsClip count={r.docsCount} onClick={() => setDocsFor(r)} />
                      <ActionsMenu actions={[
                        ...(auto && !r.renovado ? [{ label: 'Renovar', icon: <RotateCw size={14} />, onClick: () => abrirRenovar(r) }] : []),
                        { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(r) },
                        { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setConfirmEliminar(r), danger: true },
                      ]} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-list" style={{ display: 'none' }}>
            {paginados.map(r => (
              <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }} onClick={() => setDetalle(r)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.cliente_nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <span className={`badge ${r.estadoCls}`}>{r.estadoLabel}</span>
                    {r.autoRenovado && <span className="badge badge-blue" title={`Se renovó sola el ${formatFecha(r.inicioCiclo)}`}>Auto-renovado</span>}
                    <DocsClip count={r.docsCount} onClick={() => setDocsFor(r)} />
                    <ActionsMenu actions={[
                      ...(auto && !r.renovado ? [{ label: 'Renovar', icon: <RotateCw size={14} />, onClick: () => abrirRenovar(r) }] : []),
                      { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(r) },
                      { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setConfirmEliminar(r), danger: true },
                    ]} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {r.empresa}{r.empresa && ' · '}{r.tipo_contrato}
                </div>
                <div style={{ fontSize: 11.5, color: r.dias !== null && r.dias <= 90 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: r.dias !== null && r.dias <= 90 ? 700 : 400, marginTop: 4 }}>
                  {auto ? `Próx. vencimiento: ${formatFecha(r.proximoVenc)}` : `Garantía hasta: ${formatFecha(r.proximoVenc)}`}
                  {r.dias !== null && ` · ${formatDias(r.dias)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} total={filtrados.length} onChange={setPage} />

      {/* Modal nuevo contrato */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>{paso === 'cliente' ? 'Seleccionar edificio' : `Nuevo contrato — ${titulo}`}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Paso {paso === 'cliente' ? '1' : '2'} de 2</div>
                {paso === 'contrato' && clienteLocked && (
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', marginTop: 6, lineHeight: 1.2 }}>{clienteLocked.nombre}</div>
                )}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente', 'contrato'].map((p, i) => {
                const idx = ['cliente', 'contrato'].indexOf(paso)
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
                    <div key={c.id} onClick={() => { setClienteLocked(c); setForm((p: any) => ({ ...p, cliente_id: c.id })); setPaso('contrato') }}
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

            {paso === 'contrato' && (
              <>
                <ContratoForm form={form} setForm={setForm} tipo={tipo} categoria={categoria} empresas={empresas} tipos={tipos} onEmpresaAgregada={nombre => setEmpresas(p => Array.from(new Set([...p, nombre])).sort())} onTipoAgregado={nombre => setTipos(p => Array.from(new Set([...p, nombre])).sort())} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar contrato</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginBottom: 14 }}>{editando.cliente_nombre}</div>
            <ContratoForm form={editForm} setForm={setEditForm} tipo={tipo} categoria={categoria} empresas={empresas} tipos={tipos} onEmpresaAgregada={nombre => setEmpresas(p => Array.from(new Set([...p, nombre])).sort())} onTipoAgregado={nombre => setTipos(p => Array.from(new Set([...p, nombre])).sort())} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => { setConfirmEliminar(editando); setEditando(null) }}>
                <Trash2 size={14} /> Eliminar
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
                <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit}>
                  {savingEdit ? <><Loader2 size={14} /> Guardando...</> : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal renovar */}
      {renovarDe && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setRenovarDe(null) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Renovar contrato</h3>
              <button onClick={() => setRenovarDe(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>{renovarDe.cliente_nombre}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Vencía el {formatFecha(renovarDe.proximoVenc)}. Cargá el nuevo período — el contrato anterior queda marcado "Renovado" y este pasa a ser el vigente.
            </div>
            <ContratoForm form={renovarForm} setForm={setRenovarForm} tipo={tipo} categoria={categoria} empresas={empresas} tipos={tipos} onEmpresaAgregada={nombre => setEmpresas(p => Array.from(new Set([...p, nombre])).sort())} onTipoAgregado={nombre => setTipos(p => Array.from(new Set([...p, nombre])).sort())} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setRenovarDe(null)}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarRenovar} disabled={renovando || !renovarForm.fecha_firma_inicio}>
                {renovando ? <><Loader2 size={14} /> Renovando...</> : 'Renovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de contrato */}
      {detalle && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setDetalle(null) }}>
          <div className="pago-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>{detalle.cliente_nombre}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span className="badge badge-neutral">{titulo}</span>
                  <span className={`badge ${detalle.estadoCls}`}>{detalle.estadoLabel}</span>
                  {detalle.autoRenovado && <span className="badge badge-blue">Auto-renovado</span>}
                </div>
              </div>
              <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {[
                { label: 'Empresa', value: detalle.empresa || '—' as ReactNode },
                { label: 'Tipo de contrato', value: detalle.tipo_contrato || '—' as ReactNode },
                ...(auto ? [
                  { label: 'Firma / inicio', value: formatFecha(detalle.fecha_firma_inicio) as ReactNode },
                  { label: 'Vigencia', value: (detalle.vigencia_anios ? `${detalle.vigencia_anios} ${detalle.vigencia_anios === 1 ? 'año' : 'años'}` : '—') as ReactNode },
                  { label: 'Próx. vencimiento', value: <VencValor fecha={detalle.proximoVenc} dias={detalle.dias} /> },
                ] : [
                  { label: 'Inicio', value: formatFecha(detalle.fecha_firma_inicio) as ReactNode },
                  { label: 'Fin', value: formatFecha(detalle.fecha_fin) as ReactNode },
                  { label: 'Garantía hasta', value: <VencValor fecha={detalle.proximoVenc} dias={detalle.dias} /> },
                ]),
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{f.value}</div>
                </div>
              ))}
            </div>

            {detalle.autoRenovado && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', background: '#EFF6FF', margin: '16px -20px 0', padding: '12px 20px' }}>
                <div style={{ fontSize: 12.5, color: '#1D4ED8' }}>
                  Se renovó sola el {formatFecha(detalle.inicioCiclo)} por no registrarse una renovación manual a tiempo — mismas condiciones (empresa, tipo, vigencia). Revisá si sigue correcto o usá "Renovar" para cargar un cambio.
                </div>
              </div>
            )}

            {detalle.nota && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Nota</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{detalle.nota}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setDocsFor(detalle); setDetalle(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 12.5, fontWeight: 600 }}>
                <Paperclip size={14} /> Documentos {detalle.docsCount > 0 ? `(${detalle.docsCount})` : ''}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" onClick={() => setDetalle(null)}>Cerrar</button>
                {auto && !detalle.renovado && (
                  <button className="btn-primary" onClick={() => { abrirRenovar(detalle); setDetalle(null) }}>
                    <RotateCw size={14} /> Renovar
                  </button>
                )}
                <button className="btn-primary" onClick={() => { abrirEditar(detalle); setDetalle(null) }}>
                  <Pencil size={14} /> Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar este contrato?"
        message={<>Se va a eliminar el contrato de <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar?.cliente_nombre}</strong> y sus documentos adjuntos. Esta acción no se puede deshacer.</>}
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />

      {/* Modal documentos */}
      {docsFor && (
        <ContratosDocumentos
          contratoId={docsFor.id}
          clienteNombre={docsFor.cliente_nombre}
          tiposSugeridos={docsTipos(tipo)}
          onClose={() => setDocsFor(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function VencValor({ fecha, dias }: { fecha: string | null; dias: number | null }) {
  return (
    <>
      {formatFecha(fecha)}
      {dias !== null && (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: dias <= 90 ? 'var(--danger)' : 'var(--text-muted)', marginTop: 2 }}>
          {formatDias(dias)}
        </div>
      )}
    </>
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

const NUEVO_SENTINEL = '__nuevo__'

// Select con opción "+ Agregar nuevo..." encadenada: crea el registro en el catálogo (contratos_empresas
// o contratos_tipos, según "tabla") y lo deja seleccionado al toque, sin salir del formulario.
function CatalogoSelect({ tabla, categoria, value, onChange, opciones, onAgregado, placeholderNuevo }: {
  tabla: 'contratos_empresas' | 'contratos_tipos'; categoria: string; value: string; onChange: (v: string) => void
  opciones: string[]; onAgregado?: (nombre: string) => void; placeholderNuevo: string
}) {
  const supabase = createClient()
  const [agregando, setAgregando] = useState(false)
  const [nuevo, setNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function confirmar() {
    const nombre = nuevo.trim()
    if (!nombre) { setAgregando(false); return }
    setGuardando(true)
    const { error } = await supabase.from(tabla).insert([{ nombre, categoria }])
    setGuardando(false)
    if (!error || error.message.includes('unique')) {
      onChange(nombre)
      onAgregado?.(nombre)
    }
    setAgregando(false)
    setNuevo('')
  }

  if (agregando) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} autoFocus placeholder={placeholderNuevo}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmar() } if (e.key === 'Escape') { setAgregando(false); setNuevo('') } }}
          style={{ flex: 1 }} />
        <button type="button" onClick={confirmar} disabled={guardando || !nuevo.trim()} className="btn-primary" style={{ padding: '0 12px' }}>
          {guardando ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
        </button>
        <button type="button" onClick={() => { setAgregando(false); setNuevo('') }} className="btn-outline" style={{ padding: '0 10px' }}>
          <X size={14} />
        </button>
      </div>
    )
  }
  return (
    <select value={value} onChange={e => {
      if (e.target.value === NUEVO_SENTINEL) { setAgregando(true); return }
      onChange(e.target.value)
    }} style={{ color: value ? 'var(--navy)' : 'var(--slate)' }}>
      <option value="">— Seleccionar —</option>
      {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      {value && !opciones.includes(value) && <option value={value}>{value}</option>}
      <option value={NUEVO_SENTINEL}>+ Agregar nuevo...</option>
    </select>
  )
}

export function ContratoForm({ form, setForm, tipo, categoria, empresas, tipos, onEmpresaAgregada, onTipoAgregado }: {
  form: typeof emptyForm; setForm: (f: any) => void; tipo: TipoCategoria; categoria: string
  empresas: string[]; tipos: string[]
  onEmpresaAgregada?: (nombre: string) => void; onTipoAgregado?: (nombre: string) => void
}) {
  const auto = tipo === 'auto'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Empresa</label>
        <CatalogoSelect tabla="contratos_empresas" categoria={categoria} value={form.empresa}
          onChange={v => setForm((p: any) => ({ ...p, empresa: v }))} opciones={empresas} onAgregado={onEmpresaAgregada}
          placeholderNuevo="Nombre de la empresa" />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>También se administran desde Configuración</div>
      </div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Tipo de contrato</label>
        <CatalogoSelect tabla="contratos_tipos" categoria={categoria} value={form.tipo_contrato}
          onChange={v => setForm((p: any) => ({ ...p, tipo_contrato: v }))} opciones={tipos} onAgregado={onTipoAgregado}
          placeholderNuevo="Ej: Integral, Básico..." />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>También se administran desde Configuración</div>
      </div>

      {auto ? (
        <>
          <div className="fgroup"><label>Fecha de firma / inicio</label>
            <DatePicker value={form.fecha_firma_inicio} onChange={v => setForm((p: any) => ({ ...p, fecha_firma_inicio: v }))} placeholder="¿Cuándo se firmó?" /></div>
          <div className="fgroup"><label>Vigencia (años)</label>
            <input type="number" min={1} value={form.vigencia_anios}
              onChange={e => setForm((p: any) => ({ ...p, vigencia_anios: Math.max(1, parseInt(e.target.value) || 1) }))}
              style={{ width: '100%', padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Se renueva sola cada {form.vigencia_anios || 1} {(form.vigencia_anios || 1) === 1 ? 'año' : 'años'}</div>
          </div>
        </>
      ) : (
        <>
          <div className="fgroup"><label>Fecha de inicio</label>
            <DatePicker value={form.fecha_firma_inicio} onChange={v => setForm((p: any) => ({ ...p, fecha_firma_inicio: v }))} placeholder="Inicio" /></div>
          <div className="fgroup"><label>Fecha de fin</label>
            <DatePicker value={form.fecha_fin} onChange={v => setForm((p: any) => ({ ...p, fecha_fin: v }))} placeholder="Fin" /></div>
          <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Garantía</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min={0} value={form.garantia_valor}
                onChange={e => setForm((p: any) => ({ ...p, garantia_valor: Math.max(0, parseInt(e.target.value) || 0) }))}
                style={{ flex: 1, padding: '9px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', boxSizing: 'border-box' }} />
              <select value={form.garantia_unidad} onChange={e => setForm((p: any) => ({ ...p, garantia_unidad: e.target.value as UnidadGarantia }))} style={{ width: 110 }}>
                <option value="meses">Meses</option>
                <option value="anios">Años</option>
              </select>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>A partir de la fecha de fin, cuenta como "En garantía" durante este período</div>
          </div>
        </>
      )}

      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nota</label>
        <textarea value={form.nota} onChange={e => setForm((p: any) => ({ ...p, nota: e.target.value }))} rows={2}
          style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', resize: 'vertical' }} /></div>
    </div>
  )
}
