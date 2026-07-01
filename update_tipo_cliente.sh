#!/bin/bash
set -e
mkdir -p 'app/(app)/clientes'
cat > 'app/(app)/clientes/ClientesList.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Loader2, Upload, CheckCircle, AlertCircle, Download, Phone, Mail, MessageCircle, Pencil, Trash2, AlertTriangle, Building2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'

type Cliente = {
  id: string; nombre: string; direccion: string; contacto: string; tel: string; email: string; tipo: string
}
type Contacto = {
  id?: string; nombre: string; tel: string; email: string; isNew?: boolean
}

type Props = { onSelect: (id: string, nombre: string) => void }

export default function ClientesList({ onSelect }: Props) {
  const supabase = createClient()
  const csvRef   = useRef<HTMLInputElement>(null)

  const [clientes, setClientes]   = useState<Cliente[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)

  // Nuevo cliente
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })

  // Editar cliente
  const [editando, setEditando]   = useState<Cliente | null>(null)
  const [editForm, setEditForm]   = useState({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmEliminarCliente, setConfirmEliminarCliente] = useState<Cliente | null>(null)
  const [eliminandoCliente, setEliminandoCliente] = useState(false)

  // CSV import
  const [showImport, setShowImport]   = useState(false)
  const [csvPreview, setCsvPreview]   = useState<{rows: Omit<Cliente,'id'>[]; errors: string[]}>({ rows: [], errors: [] })
  const [importing, setImporting]     = useState(false)
  const [importDone, setImportDone]   = useState<{ok:number;skip:number} | null>(null)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    if (data) setClientes(data)
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const { error, data } = await supabase.from('clientes').insert([{ ...form }]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'clientes', registroId: data.id, descripcion: `Cliente creado: ${form.nombre}`, datosDespues: data })
      setForm({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
      setShowModal(false)
      await fetchClientes()
    }
    setSaving(false)
  }

  async function confirmarEliminarCliente() {
    if (!confirmEliminarCliente) return
    const { id, nombre } = confirmEliminarCliente
    setEliminandoCliente(true)
    const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
    await supabase.from('clientes').delete().eq('id', id)
    setEliminandoCliente(false)
    setConfirmEliminarCliente(null)
    await registrarAudit({ accion: 'eliminar', tabla: 'clientes', registroId: id, descripcion: `Cliente eliminado: ${nombre}`, datosAntes: data })
    await fetchClientes()
  }

  async function abrirEditar(c: Cliente) {
    setEditando(c)
    setEditForm({ nombre: c.nombre, direccion: c.direccion || '', contacto: c.contacto || '', tel: c.tel || '', email: c.email || '', tipo: c.tipo || 'edificio' })
    // Load extra contactos
    const { data } = await supabase.from('contactos').select('*').eq('cliente_id', c.id).order('created_at')
    setContactos(data || [])
  }

  function addContacto() {
    setContactos(prev => [...prev, { nombre: '', tel: '', email: '', isNew: true }])
  }

  function removeContacto(idx: number) {
    setContactos(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardarEdicion() {
    if (!editando || !editForm.nombre.trim()) return
    setSavingEdit(true)

    // Update cliente
    await supabase.from('clientes').update({
      nombre: editForm.nombre, direccion: editForm.direccion,
      contacto: editForm.contacto, tel: editForm.tel, email: editForm.email,
      tipo: editForm.tipo,
    }).eq('id', editando.id)

    // Delete all old contactos and re-insert
    await supabase.from('contactos').delete().eq('cliente_id', editando.id)
    const validContactos = contactos.filter(c => c.nombre.trim())
    if (validContactos.length > 0) {
      await supabase.from('contactos').insert(
        validContactos.map(c => ({ cliente_id: editando.id, nombre: c.nombre, tel: c.tel || null, email: c.email || null }))
      )
    }

    await registrarAudit({ accion: 'editar', tabla: 'clientes', registroId: editando.id, descripcion: `Cliente editado: ${editForm.nombre}`, datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchClientes()
  }

  // CSV helpers (unchanged)
  function descargarPlantilla() {
    const csv = ['nombre;direccion;contacto;tel;email','Le Mans;Av. Italia 1234;Juan Pérez;099123456;juan@lemans.com.uy'].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_clientes_fascioli.csv'; a.click()
    URL.revokeObjectURL(url)
  }
  function parseCsv(text: string) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return { rows: [], errors: ['El archivo está vacío'] }
    // Auto-detectar separador: ; o ,
    const sep = lines[0].includes(';') ? ';' : ','
    const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^\"|\"$/g, ''))
    const idx = { nombre: header.findIndex(h => h.includes('nombre')), direccion: header.findIndex(h => h.includes('direcci')), contacto: header.findIndex(h => h.includes('contacto')), tel: header.findIndex(h => h.includes('tel')), email: header.findIndex(h => h.includes('email') || h.includes('mail')) }
    if (idx.nombre === -1) return { rows: [], errors: ['No se encontró columna "nombre"'] }
    const rows: Omit<Cliente,'id'>[] = []; const errors: string[] = []
    lines.slice(1).forEach((line, i) => {
      const cols = line.split(sep).map(c => c.trim().replace(/^\"|\"$/g, ''))
      const nombre = cols[idx.nombre] || ''
      if (!nombre) { errors.push(`Fila ${i+2}: nombre vacío`); return }
      rows.push({ nombre, tipo: 'edificio', direccion: idx.direccion >= 0 ? cols[idx.direccion] || '' : '', contacto: idx.contacto >= 0 ? cols[idx.contacto] || '' : '', tel: idx.tel >= 0 ? cols[idx.tel] || '' : '', email: idx.email >= 0 ? cols[idx.email] || '' : '' })
    })
    return { rows, errors }
  }
  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => { const result = parseCsv(e.target?.result as string); setCsvPreview(result); setShowImport(true); setImportDone(null) }
    reader.readAsText(file, 'utf-8')
  }
  async function confirmarImport() {
    if (!csvPreview.rows.length) return
    setImporting(true)
    const { data, error } = await supabase.from('clientes').insert(csvPreview.rows).select()
    let ok = 0, skip = 0
    if (error) { for (const row of csvPreview.rows) { const { error: e } = await supabase.from('clientes').insert([row]); if (e) skip++; else ok++ } }
    else { ok = data?.length || csvPreview.rows.length }
    setImporting(false); setImportDone({ ok, skip }); await fetchClientes()
  }

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{clientes.length} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => { setShowImport(true); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>
            <Upload size={15} /> Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); e.target.value = '' }} />
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Nuevo cliente</button>
        </div>
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
            <div key={c.id} className="edif-card" onClick={() => onSelect(c.id, c.nombre)}>
              <div className="edif-avatar" style={{ background: c.tipo === 'particular' ? '#1E3557' : '#0F1E35' }}>
                {c.tipo === 'particular' ? <User size={18} color="#C9A84C" /> : <Building2 size={18} color="#C9A84C" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="edif-name">{c.nombre}</div>
                <div className="edif-addr">{c.direccion || 'Sin dirección registrada'}</div>
                {c.contacto && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.contacto}</div>}
              </div>
              {/* Edit button */}
              <button title="Editar" onClick={e => { e.stopPropagation(); abrirEditar(c) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--navy)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
                <Pencil size={14} />
              </button>
              <button className="edif-del-btn" onClick={e => { e.stopPropagation(); setConfirmEliminarCliente(c) }} title="Eliminar">
                <X size={15} />
              </button>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              {search ? 'No se encontraron clientes' : <div><div style={{ fontWeight: 600, marginBottom: 4 }}>No hay clientes aún</div><div style={{ fontSize: 12 }}>Agregá el primero arriba</div></div>}
            </div>
          )}
        </div>
      )}

      {/* Modal nuevo cliente */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo cliente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Nombre del cliente *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del edificio o cliente" autoFocus />
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Tipo de cliente</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ val: 'edificio', label: 'Edificio', Icon: Building2 }, { val: 'particular', label: 'Particular', Icon: User }].map(({ val, label, Icon }) => (
                    <button key={val} type="button"
                      onClick={() => setForm((p: any) => ({ ...p, tipo: val }))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: `2px solid ${form.tipo === val ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 9, background: form.tipo === val ? 'var(--gold-pale)' : 'var(--bg-card)', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: form.tipo === val ? 'var(--navy)' : 'var(--text-muted)', transition: 'all .15s' }}>
                      <Icon size={16} color={form.tipo === val ? 'var(--gold)' : undefined} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Dirección</label>
                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Av. Italia 7191, Montevideo" />
              </div>
              <div className="fgroup"><label>Contacto principal</label>
                <input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del responsable" /></div>
              <div className="fgroup"><label>Teléfono</label>
                <input value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} placeholder="09X XXX XXX" /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@cliente.com" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? <><Loader2 size={14} /> Guardando...</> : 'Guardar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar cliente */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar cliente</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {/* Datos principales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nombre *</label>
                <input value={editForm.nombre} onChange={e => setEditForm(p => ({...p, nombre: e.target.value}))} autoFocus /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Tipo de cliente</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ val: 'edificio', label: 'Edificio', Icon: Building2 }, { val: 'particular', label: 'Particular', Icon: User }].map(({ val, label, Icon }) => (
                    <button key={val} type="button"
                      onClick={() => setEditForm((p: any) => ({ ...p, tipo: val }))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: `2px solid ${editForm.tipo === val ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 9, background: editForm.tipo === val ? 'var(--gold-pale)' : 'var(--bg-card)', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: editForm.tipo === val ? 'var(--navy)' : 'var(--text-muted)', transition: 'all .15s' }}>
                      <Icon size={16} color={editForm.tipo === val ? 'var(--gold)' : undefined} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Dirección</label>
                <input value={editForm.direccion} onChange={e => setEditForm(p => ({...p, direccion: e.target.value}))} placeholder="Av. Italia 7191, Montevideo" /></div>
            </div>

            {/* Contacto principal */}
            <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Contacto principal
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nombre</label>
                  <input value={editForm.contacto} onChange={e => setEditForm(p => ({...p, contacto: e.target.value}))} placeholder="Nombre del responsable" /></div>
                <div className="fgroup"><label>Teléfono</label>
                  <input value={editForm.tel} onChange={e => setEditForm(p => ({...p, tel: e.target.value}))} placeholder="09X XXX XXX" /></div>
                <div className="fgroup"><label>Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} placeholder="admin@cliente.com" /></div>
              </div>
            </div>

            {/* Contactos adicionales */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>
                  Contactos adicionales
                </div>
                <button className="btn-outline btn-sm" onClick={addContacto} style={{ fontSize: 12 }}>
                  <Plus size={12} /> Agregar contacto
                </button>
              </div>

              {contactos.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: '12px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                  Sin contactos adicionales — tocá "+ Agregar contacto"
                </div>
              )}

              {contactos.map((ct, idx) => (
                <div key={idx} style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 12, marginBottom: 8, position: 'relative' }}>
                  <button onClick={() => removeContacto(idx)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={13} color="var(--danger)" />
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                    <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                      <label>Nombre *</label>
                      <input value={ct.nombre} onChange={e => setContactos(prev => prev.map((c, i) => i === idx ? {...c, nombre: e.target.value} : c))} placeholder="Nombre completo" autoFocus={ct.isNew} />
                    </div>
                    <div className="fgroup">
                      <label>Teléfono</label>
                      <input value={ct.tel} onChange={e => setContactos(prev => prev.map((c, i) => i === idx ? {...c, tel: e.target.value} : c))} placeholder="09X XXX XXX" />
                    </div>
                    <div className="fgroup">
                      <label>Email</label>
                      <input type="email" value={ct.email} onChange={e => setContactos(prev => prev.map((c, i) => i === idx ? {...c, email: e.target.value} : c))} placeholder="contacto@mail.com" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit}>
                {savingEdit ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CSV */}
      {showImport && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) } }}>
          <div className="pago-modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Importar clientes desde CSV</h3>
              <button onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {importDone ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <CheckCircle size={40} color="var(--success)" style={{ display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>Importación completada</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}><span style={{ color: 'var(--success)', fontWeight: 700 }}>{importDone.ok} clientes importados</span>{importDone.skip > 0 && <span> · {importDone.skip} omitidos</span>}</div>
                <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>Cerrar</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={descargarPlantilla} style={{ fontSize: 13, width: '100%', justifyContent: 'center' }}>
                    <Download size={14} /> Descargar plantilla CSV
                  </button>
                </div>
                {csvPreview.errors.length > 0 && (
                  <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    {csvPreview.errors.map((e, i) => <div key={i} style={{ fontSize: 12.5, color: '#92400E', display: 'flex', gap: 6 }}><AlertCircle size={14} /> {e}</div>)}
                  </div>
                )}
                {csvPreview.rows.length === 0 ? (
                  <div onClick={() => csvRef.current?.click()}
                    style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-hover)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}>
                    <Upload size={26} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--text-muted)' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>Seleccionar archivo CSV</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Hacé click o arrastrá tu archivo</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>{csvPreview.rows.length} clientes a importar</div>
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: 'var(--bg-hover)' }}>
                          {['Nombre','Dirección','Contacto','Tel','Email'].map(h => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{csvPreview.rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F1F5FB' }}>
                            <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{r.nombre}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.direccion || '—'}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.contacto || '—'}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.tel || '—'}</td>
                            <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{r.email || '—'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <button className="btn-outline" onClick={() => csvRef.current?.click()}><Upload size={14} /> Cambiar archivo</button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-outline" onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) }}>Cancelar</button>
                        <button className="btn-primary" onClick={confirmarImport} disabled={importing}>
                          {importing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</> : <>Importar {csvPreview.rows.length} clientes</>}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar cliente */}
      {confirmEliminarCliente && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminandoCliente) setConfirmEliminarCliente(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar este cliente?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                Estás por eliminar a <strong style={{ color: 'var(--text-main)' }}>{confirmEliminarCliente.nombre}</strong>.
              </p>
              <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 20 }}>
                Esta acción no se puede deshacer. Se eliminarán también todas sus pólizas, pagos y documentos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminarCliente(null)} disabled={eliminandoCliente}>
                Cancelar
              </button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarCliente}
                disabled={eliminandoCliente}
              >
                {eliminandoCliente ? 'Eliminando...' : <><Trash2 size={14} /> Eliminar definitivamente</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}


FILEEOF
git add .
git commit -m 'feat icono edificio o particular en clientes con selector de tipo'
git push
