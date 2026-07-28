'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Loader2, Pencil, Building2, ArrowLeft, Phone, Mail, Paperclip, Trash2, AlertTriangle, Upload, CheckCircle, AlertCircle, Download, RotateCw, History, Send } from 'lucide-react'
import { useSortFilter } from '@/hooks/useSortFilter'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { eliminarEdificioCompleto } from '@/lib/edificios'
import ActionsMenu from '@/components/ActionsMenu'
import ConfirmDialog from '@/components/ConfirmDialog'
import ContratosDocumentos from '@/components/ContratosDocumentos'
import ContratoHistorial from '@/components/ContratoHistorial'
import { ContratoForm, emptyForm as emptyContratoForm, TelegramaCheckbox } from '@/components/ContratosItemsPage'
import { Pagination, paginate } from '@/components/Pagination'
import {
  fetchCategorias, CategoriaRow, TipoCategoria, docsTipos, hoyISO, formatFecha, formatDias, diasHasta,
  garantiaMesesDesde, garantiaValorEnUnidad,
  calcularAuto, estadoAutoBadge, calcularObra, estadoObraBadge, prioridadEstado,
} from '@/lib/contratosConfig'

type Cliente = { id: string; nombre: string; direccion: string; contacto: string; tel: string; email: string }
const emptyCliente = { nombre: '', direccion: '', contacto: '', tel: '', email: '' }

export default function ContratosEdificiosPage() {
  const [selected, setSelected] = useState<Cliente | null>(null)
  if (selected) return <EdificioDetalle cliente={selected} onBack={() => setSelected(null)} />
  return <ClientesList onSelect={setSelected} />
}

function ClientesList({ onSelect }: { onSelect: (c: Cliente) => void }) {
  const supabase = createClient()
  const csvRef   = useRef<HTMLInputElement>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [page, setPage]         = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(emptyCliente)

  const [editando, setEditando] = useState<Cliente | null>(null)
  const [editForm, setEditForm] = useState(emptyCliente)
  const [savingEdit, setSavingEdit] = useState(false)

  const [confirmEliminar, setConfirmEliminar] = useState<Cliente | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Importación CSV
  const [showImport, setShowImport] = useState(false)
  const [csvPreview, setCsvPreview] = useState<{ rows: Omit<Cliente, 'id'>[]; errors: string[] }>({ rows: [], errors: [] })
  const [importing, setImporting]   = useState(false)
  const [importDone, setImportDone] = useState<{ ok: number; skip: number } | null>(null)

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
      await registrarAudit({ accion: 'crear', tabla: 'mant_clientes', registroId: data.id, descripcion: `Edificio creado (desde Contratos): ${form.nombre}`, datosDespues: data })
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
    await registrarAudit({ accion: 'editar', tabla: 'mant_clientes', registroId: editando.id, descripcion: `Edificio editado (desde Contratos): ${editForm.nombre}`, datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchClientes()
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await eliminarEdificioCompleto(supabase, confirmEliminar.id)
    await registrarAudit({ accion: 'eliminar', tabla: 'mant_clientes', registroId: confirmEliminar.id, descripcion: `Edificio eliminado (desde Contratos): ${confirmEliminar.nombre}, junto con sus registros de mantenimiento y contratos` })
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchClientes()
  }

  // CSV import — misma plantilla que Mantenimiento (es la misma tabla de edificios)
  function descargarPlantilla() {
    const csv = ['nombre;direccion;contacto;tel;email', 'Le Mans;Av. Italia 1234;Juan Pérez;099123456;juan@lemans.com.uy'].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_edificios_fascioli.csv'; a.click()
    URL.revokeObjectURL(url)
  }
  function parseCsv(text: string) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return { rows: [], errors: ['El archivo está vacío'] }
    const sep = lines[0].includes(';') ? ';' : ','
    const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
    const idx = { nombre: header.findIndex(h => h.includes('nombre')), direccion: header.findIndex(h => h.includes('direcci')), contacto: header.findIndex(h => h.includes('contacto')), tel: header.findIndex(h => h.includes('tel')), email: header.findIndex(h => h.includes('email') || h.includes('mail')) }
    if (idx.nombre === -1) return { rows: [], errors: ['No se encontró columna "nombre"'] }
    const rows: Omit<Cliente, 'id'>[] = []; const errors: string[] = []
    lines.slice(1).forEach((line, i) => {
      const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
      const nombre = cols[idx.nombre] || ''
      if (!nombre) { errors.push(`Fila ${i + 2}: nombre vacío`); return }
      rows.push({ nombre, direccion: idx.direccion >= 0 ? cols[idx.direccion] || '' : '', contacto: idx.contacto >= 0 ? cols[idx.contacto] || '' : '', tel: idx.tel >= 0 ? cols[idx.tel] || '' : '', email: idx.email >= 0 ? cols[idx.email] || '' : '' })
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
    const { data, error } = await supabase.from('mant_clientes').insert(csvPreview.rows).select()
    let ok = 0, skip = 0
    if (error) { for (const row of csvPreview.rows) { const { error: e } = await supabase.from('mant_clientes').insert([row]); if (e) skip++; else ok++ } }
    else { ok = data?.length || csvPreview.rows.length }
    setImporting(false); setImportDone({ ok, skip }); await fetchClientes()
  }

  const filtradosBase = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) || (c.direccion || '').toLowerCase().includes(search.toLowerCase())
  )
  const { sorted: filtrados } = useSortFilter<Cliente>(filtradosBase)
  const paginados = paginate(filtrados, page)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Edificios</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{clientes.length} edificios registrados · misma cartera que Mantenimiento</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => { setShowImport(true); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>
            <Upload size={15} /> Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); e.target.value = '' }} />
          <button className="btn-primary" onClick={() => { setForm(emptyCliente); setShowModal(true) }}><Plus size={15} /> Nuevo edificio</button>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar por nombre o dirección..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 340, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {paginados.map(c => (
            <div key={c.id} className="edif-card" onClick={() => onSelect(c)}>
              <div className="edif-avatar"><Building2 size={18} color="#C9A84C" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="edif-name">{c.nombre}</div>
                <div className="edif-addr">{c.direccion || 'Sin dirección registrada'}</div>
                {c.contacto && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.contacto}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button title="Editar" onClick={() => abrirEditar(c)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                  <Pencil size={14} />
                </button>
                <button title="Eliminar edificio" onClick={() => setConfirmEliminar(c)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              {search ? 'No se encontraron edificios' : <div><div style={{ fontWeight: 600, marginBottom: 4 }}>No hay edificios aún</div><div style={{ fontSize: 12 }}>Agregá el primero arriba</div></div>}
            </div>
          )}
        </div>
      )}
      <Pagination page={page} total={filtrados.length} onChange={setPage} />

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

      {/* Modal importar CSV */}
      {showImport && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) } }}>
          <div className="pago-modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Importar edificios desde CSV</h3>
              <button onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {importDone ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <CheckCircle size={40} color="var(--success)" style={{ display: 'block', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>Importación completada</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}><span style={{ color: 'var(--success)', fontWeight: 700 }}>{importDone.ok} edificios importados</span>{importDone.skip > 0 && <span> · {importDone.skip} omitidos</span>}</div>
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
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                    onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)' }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; const file = e.dataTransfer.files?.[0]; if (file) handleCsvFile(file) }}
                    style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-hover)', transition: 'all .15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}>
                    <Upload size={26} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--text-muted)' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>Seleccionar archivo CSV</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Hacé click o arrastrá tu archivo</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>{csvPreview.rows.length} edificios a importar</div>
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: 'var(--bg-hover)' }}>
                          {['Nombre', 'Dirección', 'Contacto', 'Tel', 'Email'].map(h => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}
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
                          {importing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</> : <>Importar {csvPreview.rows.length} edificios</>}
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

      <ConfirmDialog
        open={!!confirmEliminar}
        title={`¿Eliminar "${confirmEliminar?.nombre}"?`}
        message={<>Se va a eliminar el edificio y <strong style={{ color: 'var(--text-main)' }}>todos</strong> sus registros: extintores, tanques de agua y contratos (ascensores, rampas, servicios, obras), en Mantenimiento y en Contratos, junto con sus documentos adjuntos. Esta acción no se puede deshacer.</>}
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />

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

// ── Detalle del edificio: contratos de todas las categorías ──────────────────

type ContratoRow = {
  id: string; categoria: string; tipo_contrato: string; empresa: string
  fecha_firma_inicio: string | null; fecha_firma_original: string | null; vigencia_anios: number | null
  fecha_fin: string | null; garantia_meses: number | null; garantia_unidad: 'meses' | 'anios'; renovado: boolean
  telegrama_no_renovacion: boolean; nota: string
  docsCount: number
  estadoLabel: string; estadoCls: string; proximoVenc: string | null; dias: number | null
  autoRenovado: boolean; inicioCiclo: string | null
}

function calcularFila(r: any, tipo: TipoCategoria, hoy: string): ContratoRow {
  if (tipo === 'auto') {
    const calc = calcularAuto(r.fecha_firma_inicio, r.vigencia_anios, hoy, r.telegrama_no_renovacion)
    const badge = estadoAutoBadge(calc?.estado || null, r.renovado)
    return { ...r, docsCount: 0, estadoLabel: badge.label, estadoCls: badge.cls, proximoVenc: calc?.vencimiento ?? null, dias: calc?.dias ?? null, autoRenovado: !r.renovado && (calc?.autoRenovado ?? false), inicioCiclo: calc?.inicioCiclo ?? null }
  }
  const calc = calcularObra(r.fecha_fin, r.garantia_meses, hoy)
  const badge = estadoObraBadge(calc?.estado || null)
  return { ...r, docsCount: 0, estadoLabel: badge.label, estadoCls: badge.cls, proximoVenc: calc?.garantiaHasta ?? null, dias: diasHasta(calc?.garantiaHasta ?? null), autoRenovado: false, inicioCiclo: null }
}

function EdificioDetalle({ cliente, onBack }: { cliente: Cliente; onBack: () => void }) {
  const supabase = createClient()
  const [contratos, setContratos] = useState<ContratoRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [categorias, setCategorias] = useState<CategoriaRow[]>([])
  const [empresasPorCat, setEmpresasPorCat] = useState<Record<string, string[]>>({})
  const [tiposPorCat, setTiposPorCat] = useState<Record<string, string[]>>({})

  const [addForm, setAddForm]   = useState({ ...emptyContratoForm, categoria: '' })
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)

  const [editando, setEditando] = useState<ContratoRow | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyContratoForm, categoria: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const [confirmEliminar, setConfirmEliminar] = useState<ContratoRow | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [docsFor, setDocsFor] = useState<ContratoRow | null>(null)
  const [historialFor, setHistorialFor] = useState<ContratoRow | null>(null)
  const [confirmTelegrama, setConfirmTelegrama] = useState<{ row: ContratoRow; nuevo: boolean } | null>(null)
  const [guardandoTelegrama, setGuardandoTelegrama] = useState(false)

  function abrirConfirmTelegrama(row: ContratoRow, nuevo: boolean) {
    setConfirmTelegrama({ row, nuevo })
  }

  async function confirmarTelegrama() {
    if (!confirmTelegrama) return
    setGuardandoTelegrama(true)
    await supabase.from('contratos').update({ telegrama_no_renovacion: confirmTelegrama.nuevo }).eq('id', confirmTelegrama.row.id)
    await registrarAudit({
      accion: 'editar', tabla: 'contratos', registroId: confirmTelegrama.row.id,
      descripcion: confirmTelegrama.nuevo
        ? `Telegrama de no renovación automática registrado para ${cliente.nombre}`
        : `Telegrama de no renovación automática desmarcado para ${cliente.nombre}`,
    })
    setGuardandoTelegrama(false)
    setConfirmTelegrama(null)
    await fetchContratos()
  }

  function tipoDe(slug: string): TipoCategoria {
    return categorias.find(c => c.slug === slug)?.tipo || 'auto'
  }
  function labelDe(slug: string): string {
    return categorias.find(c => c.slug === slug)?.label || slug
  }

  useEffect(() => { fetchContratos() }, [cliente.id, categorias.length])
  useEffect(() => {
    fetchCategorias(supabase).then(cats => {
      setCategorias(cats)
      const primeraSlug = cats[0]?.slug || ''
      setAddForm(p => ({ ...p, categoria: p.categoria || primeraSlug }))
      setEditForm(p => ({ ...p, categoria: p.categoria || primeraSlug }))
    })
    supabase.from('contratos_empresas').select('nombre, categoria').then(({ data }) => {
      const map: Record<string, string[]> = {}
      ;(data || []).forEach((e: any) => { (map[e.categoria] ||= []).push(e.nombre) })
      setEmpresasPorCat(map)
    })
    supabase.from('contratos_tipos').select('nombre, categoria').then(({ data }) => {
      const map: Record<string, string[]> = {}
      ;(data || []).forEach((t: any) => { (map[t.categoria] ||= []).push(t.nombre) })
      setTiposPorCat(map)
    })
  }, [])

  async function fetchContratos() {
    if (categorias.length === 0) return
    setLoading(true)
    const hoy = hoyISO()
    const { data } = await supabase.from('contratos').select('id, categoria, tipo_contrato, empresa, fecha_firma_inicio, fecha_firma_original, vigencia_anios, fecha_fin, garantia_meses, garantia_unidad, renovado, telegrama_no_renovacion, nota, created_at').eq('cliente_id', cliente.id).eq('renovado', false).order('created_at')
    const mapped = (data || []).map((r: any) => calcularFila(r, tipoDe(r.categoria), hoy))
    const ids = mapped.map(r => r.id)
    if (ids.length > 0) {
      const { data: docsData } = await supabase.from('contratos_documentos').select('contrato_id').in('contrato_id', ids)
      const counts: Record<string, number> = {}
      ;(docsData || []).forEach((d: any) => { if (d.contrato_id) counts[d.contrato_id] = (counts[d.contrato_id] || 0) + 1 })
      mapped.forEach(r => { r.docsCount = counts[r.id] || 0 })
    }
    setContratos(mapped)
    setLoading(false)
  }

  function payloadDe(f: typeof addForm) {
    const auto = tipoDe(f.categoria) === 'auto'
    const base: any = { categoria: f.categoria, cliente_id: cliente.id, tipo_contrato: f.tipo_contrato || null, empresa: f.empresa || null, nota: f.nota || null }
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

  async function guardarNuevo() {
    setSaving(true)
    const payload = payloadDe(addForm)
    if (tipoDe(addForm.categoria) === 'auto') payload.fecha_firma_original = addForm.fecha_firma_inicio || null
    const { error, data } = await supabase.from('contratos').insert([payload]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'contratos', registroId: data.id, descripcion: `Contrato de ${labelDe(addForm.categoria).toLowerCase()} creado para ${cliente.nombre}`, datosDespues: data })
      setShowAdd(false)
      setAddForm({ ...emptyContratoForm, categoria: categorias[0]?.slug || '' })
      await fetchContratos()
    }
    setSaving(false)
  }

  function abrirEditar(r: ContratoRow) {
    setEditando(r)
    setEditForm({
      categoria: r.categoria, tipo_contrato: r.tipo_contrato || '', empresa: r.empresa || '',
      fecha_firma_inicio: r.fecha_firma_inicio || '', vigencia_anios: r.vigencia_anios || 1,
      fecha_fin: r.fecha_fin || '',
      garantia_valor: garantiaValorEnUnidad(r.garantia_meses || 12, r.garantia_unidad || 'meses'),
      garantia_unidad: r.garantia_unidad || 'meses',
      nota: r.nota || '',
      cliente_id: cliente.id,
    })
  }

  async function guardarEdicion() {
    if (!editando) return
    setSavingEdit(true)
    const payload = payloadDe(editForm)
    await supabase.from('contratos').update(payload).eq('id', editando.id)
    await registrarAudit({ accion: 'editar', tabla: 'contratos', registroId: editando.id, descripcion: 'Contrato editado desde ficha de edificio', datosDespues: editForm })
    setEditando(null)
    setSavingEdit(false)
    await fetchContratos()
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await supabase.from('contratos').delete().eq('id', confirmEliminar.id)
    await registrarAudit({ accion: 'eliminar', tabla: 'contratos', registroId: confirmEliminar.id, descripcion: 'Contrato eliminado desde ficha de edificio' })
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchContratos()
  }

  const [renovarDe, setRenovarDe] = useState<ContratoRow | null>(null)
  const [renovarForm, setRenovarForm] = useState({ ...emptyContratoForm, categoria: '' })
  const [renovando, setRenovando] = useState(false)

  function abrirRenovar(r: ContratoRow) {
    setRenovarDe(r)
    setRenovarForm({ ...emptyContratoForm, categoria: r.categoria, empresa: r.empresa || '', tipo_contrato: r.tipo_contrato || '', vigencia_anios: r.vigencia_anios || 1 })
  }

  async function confirmarRenovar() {
    if (!renovarDe || !renovarForm.fecha_firma_inicio) return
    setRenovando(true)
    const payload = payloadDe(renovarForm)
    if (tipoDe(renovarForm.categoria) === 'auto') payload.fecha_firma_original = renovarForm.fecha_firma_inicio || null
    const { error, data } = await supabase.from('contratos').insert([payload]).select().single()
    if (!error && data) {
      await supabase.from('contratos').update({ renovado: true }).eq('id', renovarDe.id)
      await registrarAudit({ accion: 'crear', tabla: 'contratos', registroId: data.id, descripcion: `Renovación de contrato de ${labelDe(renovarDe.categoria).toLowerCase()} para ${cliente.nombre}`, datosDespues: data })
      setRenovarDe(null)
      await fetchContratos()
    }
    setRenovando(false)
  }

  return (
    <div>
      <button onClick={onBack} className="btn-outline btn-sm" style={{ marginBottom: 16 }}><ArrowLeft size={13} /> Volver a edificios</button>

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
        <button className="btn-primary btn-sm" onClick={() => { setAddForm({ ...emptyContratoForm, categoria: categorias[0]?.slug || '' }); setShowAdd(true) }}>
          <Plus size={13} /> Nuevo contrato
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : contratos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin contratos para este edificio</div>
          <div style={{ fontSize: 12 }}>Agregá el primero arriba</div>
        </div>
      ) : (
        categorias.map(cat => {
          const items = contratos.filter(c => c.categoria === cat.slug).sort((a, b) => prioridadEstado(a.estadoLabel) - prioridadEstado(b.estadoLabel))
          if (items.length === 0) return null
          return (
            <div key={cat.slug} className="table-card" style={{ marginBottom: 20 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-soft)', fontWeight: 700, fontSize: 14 }}>
                {cat.label} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>({items.length})</span>
              </div>
              {items.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #F1F5FB' }}>
                  <div style={{ fontSize: 13.5 }}>
                    {it.empresa && <span style={{ fontWeight: 600 }}>{it.empresa}</span>}
                    {it.tipo_contrato && <span style={{ color: 'var(--text-muted)' }}> · {it.tipo_contrato}</span>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {tipoDe(it.categoria) === 'auto'
                        ? <>Firma original {formatFecha(it.fecha_firma_original || it.fecha_firma_inicio)} · Últ. renovación {formatFecha(it.inicioCiclo || it.fecha_firma_inicio)} · Vigencia {it.vigencia_anios || '—'} {it.vigencia_anios === 1 ? 'año' : 'años'} · Próx. vencimiento {formatFecha(it.proximoVenc)}</>
                        : <>Inicio {formatFecha(it.fecha_firma_inicio)} · Fin {formatFecha(it.fecha_fin)} · Garantía hasta {formatFecha(it.proximoVenc)}</>}
                      {it.dias !== null && (
                        <span style={{ color: it.dias <= 90 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: it.dias <= 90 ? 700 : 400 }}> · {formatDias(it.dias)}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className={`badge ${it.estadoCls}`} style={{ marginRight: it.autoRenovado ? 4 : 6 }}>{it.estadoLabel}</span>
                    {it.autoRenovado && <span className="badge badge-blue" style={{ marginRight: 6 }} title={`Se renovó sola el ${formatFecha(it.inicioCiclo)}`}>Auto-renovado</span>}
                    {tipoDe(it.categoria) === 'auto' && (
                      <span style={{ marginRight: 4 }} title="Telegrama de no renovación automática">
                        <TelegramaCheckbox checked={it.telegrama_no_renovacion} onToggle={nuevo => abrirConfirmTelegrama(it, nuevo)} />
                      </span>
                    )}
                    <DocsClip count={it.docsCount} onClick={() => setDocsFor(it)} />
                    <ActionsMenu actions={[
                      ...(tipoDe(it.categoria) === 'auto' && !it.renovado ? [{ label: 'Renovar', icon: <RotateCw size={14} />, onClick: () => abrirRenovar(it) }] : []),
                      ...(tipoDe(it.categoria) === 'auto' ? [{ label: 'Historial', icon: <History size={14} />, onClick: () => setHistorialFor(it) }] : []),
                      { label: 'Editar', icon: <Pencil size={14} />, onClick: () => abrirEditar(it) },
                      { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setConfirmEliminar(it), danger: true },
                    ]} />
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}

      {showAdd && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo contrato</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="fgroup" style={{ marginBottom: 12 }}>
              <label>Categoría</label>
              <select value={addForm.categoria} onChange={e => setAddForm(p => ({ ...p, categoria: e.target.value }))}>
                {categorias.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
            </div>
            <ContratoForm form={addForm} setForm={setAddForm} tipo={tipoDe(addForm.categoria)} categoria={addForm.categoria} empresas={empresasPorCat[addForm.categoria] || []} tipos={tiposPorCat[addForm.categoria] || []}
              onEmpresaAgregada={nombre => setEmpresasPorCat(p => ({ ...p, [addForm.categoria]: Array.from(new Set([...(p[addForm.categoria] || []), nombre])).sort() }))}
              onTipoAgregado={nombre => setTiposPorCat(p => ({ ...p, [addForm.categoria]: Array.from(new Set([...(p[addForm.categoria] || []), nombre])).sort() }))} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarNuevo} disabled={saving}>
                {saving ? <><Loader2 size={14} /> Guardando...</> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar contrato — {labelDe(editando.categoria)}</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <ContratoForm form={editForm} setForm={setEditForm} tipo={tipoDe(editForm.categoria)} categoria={editForm.categoria} empresas={empresasPorCat[editForm.categoria] || []} tipos={tiposPorCat[editForm.categoria] || []}
              onEmpresaAgregada={nombre => setEmpresasPorCat(p => ({ ...p, [editForm.categoria]: Array.from(new Set([...(p[editForm.categoria] || []), nombre])).sort() }))}
              onTipoAgregado={nombre => setTiposPorCat(p => ({ ...p, [editForm.categoria]: Array.from(new Set([...(p[editForm.categoria] || []), nombre])).sort() }))} />
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

      {renovarDe && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setRenovarDe(null) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Renovar contrato — {labelDe(renovarDe.categoria)}</h3>
              <button onClick={() => setRenovarDe(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Vencía el {formatFecha(renovarDe.proximoVenc)}. Cargá el nuevo período — el contrato anterior queda marcado "Renovado" y este pasa a ser el vigente.
            </div>
            <ContratoForm form={renovarForm} setForm={setRenovarForm} tipo={tipoDe(renovarForm.categoria)} categoria={renovarForm.categoria} empresas={empresasPorCat[renovarForm.categoria] || []} tipos={tiposPorCat[renovarForm.categoria] || []}
              onEmpresaAgregada={nombre => setEmpresasPorCat(p => ({ ...p, [renovarForm.categoria]: Array.from(new Set([...(p[renovarForm.categoria] || []), nombre])).sort() }))}
              onTipoAgregado={nombre => setTiposPorCat(p => ({ ...p, [renovarForm.categoria]: Array.from(new Set([...(p[renovarForm.categoria] || []), nombre])).sort() }))} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setRenovarDe(null)}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarRenovar} disabled={renovando || !renovarForm.fecha_firma_inicio}>
                {renovando ? <><Loader2 size={14} /> Renovando...</> : 'Renovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar este contrato?"
        message={<>Se va a eliminar este contrato y sus documentos adjuntos. Esta acción no se puede deshacer.</>}
        loading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />

      {docsFor && (
        <ContratosDocumentos
          contratoId={docsFor.id}
          clienteNombre={cliente.nombre}
          tiposSugeridos={docsTipos(tipoDe(docsFor.categoria))}
          onClose={() => setDocsFor(null)}
        />
      )}

      {historialFor && (
        <ContratoHistorial
          clienteId={cliente.id}
          categoria={historialFor.categoria}
          clienteNombre={cliente.nombre}
          onClose={() => setHistorialFor(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmTelegrama}
        tone="neutral"
        icon={<Send size={24} color="var(--gold)" />}
        title={confirmTelegrama?.nuevo ? '¿Marcar telegrama enviado?' : '¿Desmarcar telegrama enviado?'}
        message={
          confirmTelegrama?.nuevo
            ? <>Confirmá que se envió el telegrama de no renovación automática para <strong style={{ color: 'var(--text-main)' }}>{cliente.nombre}</strong>. Este contrato va a dejar de renovarse solo — si se vence, va a quedar "Vencido" hasta que lo renueves a mano. Igual se va a seguir avisando que está por vencer.</>
            : <>Confirmá que querés desmarcar el telegrama de <strong style={{ color: 'var(--text-main)' }}>{cliente.nombre}</strong>. Este contrato vuelve a renovarse solo automáticamente si se vence.</>
        }
        confirmLabel={confirmTelegrama?.nuevo ? 'Marcar' : 'Desmarcar'}
        loadingLabel="Guardando..."
        loading={guardandoTelegrama}
        onConfirm={confirmarTelegrama}
        onCancel={() => setConfirmTelegrama(null)}
      />

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
