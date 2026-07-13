'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Search, Plus, X, Loader2, Pencil, Building2, ArrowLeft, Flame, Droplets, Phone, Mail, Paperclip, MessageSquareWarning, Trash2, AlertTriangle } from 'lucide-react'
import { useSortFilter } from '@/hooks/useSortFilter'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import MantDocumentos from '@/components/MantDocumentos'
import MantReclamos from '@/components/MantReclamos'
import ActionsMenu from '@/components/ActionsMenu'
import { ItemForm, emptyForm as emptyMantForm } from '@/components/MantItemsPage'
import { ACCION, estadoBadgeClass } from '@/lib/mantenimientoConfig'

type Cliente = { id: string; nombre: string; direccion: string; contacto: string; tel: string; email: string }
const emptyCliente = { nombre: '', direccion: '', contacto: '', tel: '', email: '' }

export default function MantClientesPage() {
  const [selected, setSelected] = useState<Cliente | null>(null)
  if (selected) return <ClienteDetalle cliente={selected} onBack={() => setSelected(null)} />
  return <ClientesList onSelect={setSelected} />
}

function ClientesList({ onSelect }: { onSelect: (c: Cliente) => void }) {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(emptyCliente)

  const [editando, setEditando] = useState<Cliente | null>(null)
  const [editForm, setEditForm] = useState(emptyCliente)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('mant_clientes').select('*').order('nombre')
    if (data) setClientes(data)
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const { error, data } = await supabase.from('mant_clientes').insert([form]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'mant_clientes', registroId: data.id, descripcion: `Edificio creado: ${form.nombre}`, datosDespues: data })
      setForm(emptyCliente)
      setShowModal(false)
      await fetchClientes()
    }
    setSaving(false)
  }

  function abrirEditar(c: Cliente) {
    setEditando(c)
    setEditForm({ nombre: c.nombre, direccion: c.direccion || '', contacto: c.contacto || '', tel: c.tel || '', email: c.email || '' })
  }

  async function guardarEdicion() {
    if (!editando || !editForm.nombre.trim()) return
    setSavingEdit(true)
    await supabase.from('mant_clientes').update(editForm).eq('id', editando.id)
    await registrarAudit({ accion: 'editar', tabla: 'mant_clientes', registroId: editando.id, descripcion: `Edificio editado: ${editForm.nombre}`, datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchClientes()
  }

  const filtradosBase = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) || (c.direccion || '').toLowerCase().includes(search.toLowerCase())
  )
  const { sorted: filtrados } = useSortFilter<Cliente>(filtradosBase)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{clientes.length} edificios registrados</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyCliente); setShowModal(true) }}><Plus size={15} /> Nuevo edificio</button>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar por nombre o dirección..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 340, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtrados.map(c => (
            <div key={c.id} className="edif-card" onClick={() => onSelect(c)}>
              <div className="edif-avatar"><Building2 size={18} color="#C9A84C" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="edif-name">{c.nombre}</div>
                <div className="edif-addr">{c.direccion || 'Sin dirección registrada'}</div>
                {c.contacto && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.contacto}</div>}
              </div>
              <button title="Editar" onClick={e => { e.stopPropagation(); abrirEditar(c) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Pencil size={14} />
              </button>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              {search ? 'No se encontraron edificios' : <div><div style={{ fontWeight: 600, marginBottom: 4 }}>No hay edificios aún</div><div style={{ fontSize: 12 }}>Agregá el primero arriba</div></div>}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo edificio</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <ClienteForm form={form} setForm={setForm} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? <><Loader2 size={14} /> Guardando...</> : 'Guardar edificio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar edificio</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <ClienteForm form={editForm} setForm={setEditForm} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit}>
                {savingEdit ? <><Loader2 size={14} /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ClienteForm({ form, setForm }: { form: typeof emptyCliente; setForm: (f: any) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Nombre del edificio *</label>
        <input value={form.nombre} onChange={e => setForm((p: any) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del edificio" autoFocus />
      </div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Dirección</label>
        <input value={form.direccion} onChange={e => setForm((p: any) => ({ ...p, direccion: e.target.value }))} placeholder="Av. Italia 7191, Montevideo" />
      </div>
      <div className="fgroup"><label>Contacto principal</label>
        <input value={form.contacto} onChange={e => setForm((p: any) => ({ ...p, contacto: e.target.value }))} placeholder="Nombre del responsable" /></div>
      <div className="fgroup"><label>Teléfono</label>
        <input value={form.tel} onChange={e => setForm((p: any) => ({ ...p, tel: e.target.value }))} placeholder="09X XXX XXX" /></div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Email</label>
        <input type="email" value={form.email} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} placeholder="admin@edificio.com" /></div>
    </div>
  )
}

type RegItem = {
  id: string; fecha_servicio: string | null; vencimiento: string | null; empresa: string; estado: string
  created_at: string; dias: number | null; vigente: boolean; docsCount: number
  cant_co2: number; cant_8kg: number; cant_4kg: number; cant_espuma: number
  cant_ensayo_hidrostatico: number; vencimiento_ensayo: string | null; extras: Record<string, number>; dias_ensayo: number | null
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

function ClienteDetalle({ cliente, onBack }: { cliente: Cliente; onBack: () => void }) {
  const supabase = createClient()
  const [extintores, setExtintores] = useState<RegItem[]>([])
  const [tanques, setTanques]       = useState<RegItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [addTipo, setAddTipo]       = useState<'mant_extintores' | 'mant_tanques' | null>(null)
  const [addForm, setAddForm]       = useState(emptyMantForm)
  const [saving, setSaving]         = useState(false)
  const [docsFor, setDocsFor]       = useState<{ tipo: 'mant_extintores' | 'mant_tanques'; item: RegItem } | null>(null)
  const [reclamosFor, setReclamosFor] = useState<{ tipo: 'mant_extintores' | 'mant_tanques'; item: RegItem } | null>(null)

  const [editItem, setEditItem]         = useState<{ tipo: 'mant_extintores' | 'mant_tanques'; item: RegItem } | null>(null)
  const [editItemForm, setEditItemForm] = useState(emptyMantForm)
  const [savingEditItem, setSavingEditItem] = useState(false)

  const [confirmEliminarItem, setConfirmEliminarItem] = useState<{ tipo: 'mant_extintores' | 'mant_tanques'; item: RegItem } | null>(null)
  const [eliminandoItem, setEliminandoItem] = useState(false)

  useEffect(() => { fetchRegistros() }, [cliente.id])

  function abrirEditarItem(tipo: 'mant_extintores' | 'mant_tanques', item: RegItem) {
    setEditItem({ tipo, item })
    setEditItemForm({
      ...emptyMantForm,
      fecha_servicio: item.fecha_servicio || '', vencimiento: item.vencimiento || '', empresa: item.empresa, estado: item.estado || 'No realizado',
      cant_co2: item.cant_co2 || 0, cant_8kg: item.cant_8kg || 0, cant_4kg: item.cant_4kg || 0, cant_espuma: item.cant_espuma || 0,
      cant_ensayo_hidrostatico: item.cant_ensayo_hidrostatico || 0, vencimiento_ensayo: item.vencimiento_ensayo || '', extras: item.extras || {},
    })
  }

  async function guardarEdicionItem() {
    if (!editItem) return
    setSavingEditItem(true)
    const payload: any = {
      fecha_servicio: editItemForm.fecha_servicio || null,
      vencimiento: editItemForm.vencimiento || null,
      empresa: editItemForm.empresa || null,
      estado: editItemForm.estado || null,
    }
    if (editItem.tipo === 'mant_extintores') {
      payload.cant_co2 = editItemForm.cant_co2 || 0
      payload.cant_8kg = editItemForm.cant_8kg || 0
      payload.cant_4kg = editItemForm.cant_4kg || 0
      payload.cant_espuma = editItemForm.cant_espuma || 0
      payload.cant_ensayo_hidrostatico = editItemForm.cant_ensayo_hidrostatico || 0
      payload.vencimiento_ensayo = editItemForm.vencimiento_ensayo || null
      payload.extras = editItemForm.extras || {}
    }
    await supabase.from(editItem.tipo).update(payload).eq('id', editItem.item.id)
    await registrarAudit({ accion: 'editar', tabla: editItem.tipo, registroId: editItem.item.id, descripcion: 'Registro editado desde ficha de cliente', datosDespues: editItemForm })
    setEditItem(null)
    setSavingEditItem(false)
    await fetchRegistros()
  }

  async function confirmarEliminarItem() {
    if (!confirmEliminarItem) return
    setEliminandoItem(true)
    await supabase.from(confirmEliminarItem.tipo).delete().eq('id', confirmEliminarItem.item.id)
    await registrarAudit({ accion: 'eliminar', tabla: confirmEliminarItem.tipo, registroId: confirmEliminarItem.item.id, descripcion: 'Registro eliminado desde ficha de cliente' })
    setEliminandoItem(false)
    setConfirmEliminarItem(null)
    await fetchRegistros()
  }

  function marcarVigente(rows: any[]): RegItem[] {
    const mapped: RegItem[] = rows.map(r => ({
      ...r, empresa: r.empresa || '', estado: r.estado || '', dias: diasHasta(r.vencimiento), vigente: false, docsCount: 0,
      cant_co2: r.cant_co2 || 0, cant_8kg: r.cant_8kg || 0, cant_4kg: r.cant_4kg || 0, cant_espuma: r.cant_espuma || 0,
      cant_ensayo_hidrostatico: r.cant_ensayo_hidrostatico || 0, vencimiento_ensayo: r.vencimiento_ensayo || null,
      extras: r.extras || {}, dias_ensayo: diasHasta(r.vencimiento_ensayo || null),
    }))
    const masReciente = [...mapped].sort((a, b) => (b.fecha_servicio || b.created_at || '').localeCompare(a.fecha_servicio || a.created_at || ''))[0]
    if (masReciente) masReciente.vigente = true
    return mapped
  }

  async function aplicarConteoDocs(tipo: 'mant_extintores' | 'mant_tanques', items: RegItem[]) {
    const ids = items.map(i => i.id)
    if (ids.length === 0) return
    const fkCol = tipo === 'mant_extintores' ? 'extintor_id' : 'tanque_id'
    const { data } = await supabase.from('mant_documentos').select(fkCol).in(fkCol, ids)
    const counts: Record<string, number> = {}
    ;(data || []).forEach((d: any) => { const k = d[fkCol]; if (k) counts[k] = (counts[k] || 0) + 1 })
    items.forEach(it => { it.docsCount = counts[it.id] || 0 })
  }

  async function fetchRegistros() {
    setLoading(true)
    const [{ data: ext }, { data: tan }] = await Promise.all([
      supabase.from('mant_extintores').select('id, fecha_servicio, vencimiento, empresa, estado, created_at, cant_co2, cant_8kg, cant_4kg, cant_espuma, cant_ensayo_hidrostatico, vencimiento_ensayo, extras').eq('cliente_id', cliente.id).order('vencimiento'),
      supabase.from('mant_tanques').select('id, fecha_servicio, vencimiento, empresa, estado, created_at').eq('cliente_id', cliente.id).order('vencimiento'),
    ])
    const extMapped = marcarVigente(ext || [])
    const tanMapped = marcarVigente(tan || [])
    await Promise.all([aplicarConteoDocs('mant_extintores', extMapped), aplicarConteoDocs('mant_tanques', tanMapped)])
    setExtintores(extMapped)
    setTanques(tanMapped)
    setLoading(false)
  }

  async function guardarNuevo() {
    if (!addTipo) return
    setSaving(true)
    const payload: any = {
      cliente_id: cliente.id,
      fecha_servicio: addForm.fecha_servicio || null,
      vencimiento: addForm.vencimiento || null,
      empresa: addForm.empresa || null,
      estado: addForm.estado || null,
    }
    if (addTipo === 'mant_extintores') {
      payload.cant_co2 = addForm.cant_co2 || 0
      payload.cant_8kg = addForm.cant_8kg || 0
      payload.cant_4kg = addForm.cant_4kg || 0
      payload.cant_espuma = addForm.cant_espuma || 0
      payload.cant_ensayo_hidrostatico = addForm.cant_ensayo_hidrostatico || 0
      payload.vencimiento_ensayo = addForm.vencimiento_ensayo || null
      payload.extras = addForm.extras || {}
    }
    await supabase.from(addTipo).insert([payload])
    setSaving(false)
    setAddTipo(null)
    setAddForm(emptyMantForm)
    await fetchRegistros()
  }

  function Seccion({ tipo, titulo, icon, items }: { tipo: 'mant_extintores' | 'mant_tanques'; titulo: string; icon: React.ReactNode; items: RegItem[] }) {
    return (
      <div className="table-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>{icon} {titulo} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>({items.length})</span></div>
          <button className="btn-outline btn-sm" onClick={() => { setAddTipo(tipo); setAddForm(emptyMantForm) }}><Plus size={13} /> Nueva {ACCION[tipo]}</button>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin registros para este edificio</div>
        ) : (
          items.map(it => {
            const b = vencBadge(it.dias)
            return (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #F1F5FB', opacity: it.vigente ? 1 : 0.7 }}>
                <div style={{ fontSize: 13.5 }}>
                  {it.vigente && <span className="badge badge-gold" style={{ marginRight: 8 }}>Vigente</span>}
                  {it.fecha_servicio && <span style={{ color: 'var(--text-muted)' }}>Servicio {formatFecha(it.fecha_servicio)} · </span>}
                  <span style={{ fontWeight: 600 }}>Vence {formatFecha(it.vencimiento)}</span>
                  {it.empresa && <span style={{ color: 'var(--text-muted)' }}> · {it.empresa}</span>}
                  {it.estado && <span className={`badge ${estadoBadgeClass(it.estado)}`} style={{ marginLeft: 8 }}>{it.estado}</span>}
                  {tipo === 'mant_extintores' && (it.cant_co2 + it.cant_8kg + it.cant_4kg + it.cant_espuma > 0) && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {it.cant_co2 + it.cant_8kg + it.cant_4kg + it.cant_espuma} recargados
                      {it.vencimiento_ensayo && (
                        <> · Ensayo hidrostático {formatFecha(it.vencimiento_ensayo)} <span className={`badge ${vencBadge(it.dias_ensayo).cls}`}>{vencBadge(it.dias_ensayo).label}</span></>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className={`badge ${b.cls}`} style={{ marginRight: 6 }}>{b.label}</span>
                  <DocsClip count={it.docsCount} onClick={() => setDocsFor({ tipo, item: it })} />
                  <ActionsMenu actions={[
                    { label: 'Reclamos', icon: <MessageSquareWarning size={14} />, onClick: () => setReclamosFor({ tipo, item: it }) },
                    { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditarItem(tipo, it) },
                    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setConfirmEliminarItem({ tipo, item: it }), danger: true },
                  ]} />
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div>
      <button onClick={onBack} className="btn-outline btn-sm" style={{ marginBottom: 16 }}><ArrowLeft size={13} /> Volver a clientes</button>

      <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-soft)', padding: 20, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="edif-avatar" style={{ width: 50, height: 50 }}><Building2 size={22} color="#C9A84C" /></div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{cliente.nombre}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{cliente.direccion || 'Sin dirección registrada'}</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
          {cliente.contacto && <span>{cliente.contacto}</span>}
          {cliente.tel && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {cliente.tel}</span>}
          {cliente.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {cliente.email}</span>}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <>
          <Seccion tipo="mant_extintores" titulo="Extintores" icon={<Flame size={16} color="#D97706" />} items={extintores} />
          <Seccion tipo="mant_tanques" titulo="Tanques de agua" icon={<Droplets size={16} color="#2E9668" />} items={tanques} />
        </>
      )}

      {addTipo && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setAddTipo(null) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nueva {addTipo ? ACCION[addTipo] : ''} {addTipo === 'mant_extintores' ? 'de extintores' : 'de tanques de agua'}</h3>
              <button onClick={() => setAddTipo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <ItemForm form={addForm} setForm={setAddForm} clientes={[]} clienteLocked={{ id: cliente.id, nombre: cliente.nombre }} tabla={addTipo!} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setAddTipo(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarNuevo} disabled={saving}>
                {saving ? <><Loader2 size={14} /> Guardando...</> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {docsFor && (
        <MantDocumentos
          tabla={docsFor.tipo}
          registroId={docsFor.item.id}
          clienteNombre={cliente.nombre}
          tiposSugeridos={docsFor.tipo === 'mant_extintores' ? ['Certificado de recarga', 'Foto', 'Otro'] : ['Análisis de potabilidad', 'Certificado de limpieza', 'Foto', 'Otro']}
          onClose={() => setDocsFor(null)}
        />
      )}

      {reclamosFor && (
        <MantReclamos
          tabla={reclamosFor.tipo}
          registroId={reclamosFor.item.id}
          clienteNombre={cliente.nombre}
          onClose={() => setReclamosFor(null)}
        />
      )}

      {editItem && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditItem(null) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar {ACCION[editItem.tipo]}</h3>
              <button onClick={() => setEditItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <ItemForm form={editItemForm} setForm={setEditItemForm} clientes={[]} clienteLocked={{ id: cliente.id, nombre: cliente.nombre }} tabla={editItem.tipo} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => { setConfirmEliminarItem(editItem); setEditItem(null) }}>
                <Trash2 size={14} /> Eliminar
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" onClick={() => setEditItem(null)}>Cancelar</button>
                <button className="btn-primary" onClick={guardarEdicionItem} disabled={savingEditItem}>
                  {savingEditItem ? <><Loader2 size={14} /> Guardando...</> : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmEliminarItem && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminandoItem) setConfirmEliminarItem(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar este registro?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                Se va a eliminar este registro y sus documentos adjuntos. Esta acción no se puede deshacer.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminarItem(null)} disabled={eliminandoItem}>Cancelar</button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarItem} disabled={eliminandoItem}>
                {eliminandoItem ? 'Eliminando...' : <><Trash2 size={14} /> Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
