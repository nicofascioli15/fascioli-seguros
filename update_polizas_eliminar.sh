#!/bin/bash
set -e
mkdir -p 'app/(app)/polizas'
cat > 'app/(app)/polizas/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, X, Loader2, Paperclip, ArrowLeft, FileText, CreditCard, Bell, Upload, Download, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'

// Catalogs loaded from Supabase

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}


function formatValor(valor: string): string {
  if (!valor) return '—'
  if (valor.includes('|')) {
    const [monto, moneda] = valor.split('|')
    const num = Number(monto)
    if (!isNaN(num)) return `${moneda} ${num.toLocaleString('es-UY', { minimumFractionDigits: 0 })}`
  }
  return valor
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function estadoBadge(venc: string | null) {
  const d = diasHasta(venc)
  if (d === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (d < 0)     return { label: 'Vencida',   cls: 'badge-danger' }
  if (d <= 30)   return { label: `${d}d`,     cls: 'badge-danger' }
  if (d <= 90)   return { label: `${d}d`,     cls: 'badge-warning' }
  return               { label: formatFecha(venc), cls: 'badge-success' }
}

function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthRaw = m - 1 + months
  const targetYear  = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const raw = `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(Math.min(d, maxDay)).padStart(2,'0')}`
  return raw
}

function CuotasFechas({ cuotas, value, onChange }: {
  cuotas: number; value: string[]; onChange: (v: string[]) => void
}) {
  if (cuotas === 0) return (
    <div style={{ padding: '12px', background: '#F4F7FB', borderRadius: 8, fontSize: 13, color: 'var(--slate)', textAlign: 'center' }}>
      Ingresá la cantidad de cuotas primero
    </div>
  )
  const dates = Array.from({ length: cuotas }, (_, i) => value[i] || '')
  function handleChange(idx: number, val: string) {
    const next = [...dates]
    next[idx] = val
    if (idx === 0 && val) {
      for (let i = 1; i < cuotas; i++) {
        if (!next[i]) next[i] = addMonthsAndDays(val, i)
      }
    }
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
      {dates.map((fecha, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: fecha ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: fecha ? 'var(--gold)' : 'var(--slate)', flexShrink: 0 }}>{i+1}</div>
          <div style={{ flex: 1 }}>
            <DatePicker value={fecha} onChange={val => handleChange(i, val)}
              placeholder={i === 0 ? 'Fecha 1ª cuota (auto-completa las siguientes)' : `Fecha cuota ${i+1}`} />
          </div>
          {i === 0 && fecha && cuotas > 1 && (
            <button onClick={() => onChange(Array.from({ length: cuotas }, (_, j) => addMonthsAndDays(fecha, j)))}
              style={{ flexShrink: 0, padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
              Recalcular
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function fechasACuotaMes(fechas: string[]): string {
  return fechas.map((f, i) => {
    if (!f) return `${i+1}/?`
    const [y,m,d] = f.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
  }).join(' - ')
}

type Cliente  = { id: string; nombre: string; direccion: string }
type Poliza   = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null; corredor: string; moneda: string; cuotas: number; cuota_mes: string; nota: string | null; cliente_id: string; clientes?: { nombre: string }; doc_count?: number }
type Documento = { id: string; nombre: string; storage_path: string; tipo: string; tamanio_bytes: number; created_at: string }
type Pago     = { id: string; cuota_num: number; fecha: string; metodo: string }
type Paso = 'cliente' | 'poliza'

const extStyle: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: '#FEE2E2', color: '#991B1B', label: 'PDF' },
  jpg:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  jpeg: { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  png:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  docx: { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  xlsx: { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
}
function getExt(nombre: string) { return nombre.split('.').pop()?.toLowerCase() || 'pdf' }
function formatBytes(b: number) {
  if (!b) return '—'
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function PolizasPage() {
  const supabase = createClient()

  const [polizas, setPolizas]         = useState<Poliza[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtroRamo, setFiltroRamo]   = useState('Todos')
  const [catalogos, setCatalogos]     = useState<{ramos:string[];companias:string[];corredores:string[];monedas:string[]}>({ramos:[],companias:[],corredores:[],monedas:[]})

  // Row menu
  const [editando, setEditando]       = useState<Poliza | null>(null)
  const [editForm, setEditForm]       = useState<Partial<Poliza>>({})
  const [savingEdit, setSavingEdit]         = useState(false)
  const [editCamposRamo, setEditCamposRamo] = useState<{id:string;nombre:string;tipo:string;opciones:string|null}[]>([])
  const [editValores, setEditValores]       = useState<Record<string,string>>({})

  // Detail view
  const [detalle, setDetalle]         = useState<Poliza | null>(null)
  const [detalleDocs, setDetalleDocs] = useState<Documento[]>([])
  const [detallePagos, setDetallePagos] = useState<Pago[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [showPagoModal, setShowPagoModal]   = useState<number | null>(null) // cuota_num
  const [pagoForm, setPagoForm]             = useState({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' })
  const [savingPago, setSavingPago]         = useState(false)
  const [metodos, setMetodos]               = useState<string[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const fileInputRef = useState<HTMLInputElement | null>(null)

  // New poliza modal
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: '' })
  const [camposRamo, setCamposRamo]   = useState<{id:string;nombre:string;tipo:string;opciones:string|null}[]>([])
  const [valoresCampos, setValoresCampos] = useState<Record<string,string>>({})

  useEffect(() => {
    fetchPolizas()
    fetchClientes()
    fetchCatalogos()
    supabase.from('metodos_pago').select('nombre').order('nombre').then(({ data }) => {
      if (data) setMetodos(data.map((x: any) => x.nombre))
    })
  }, [])

  async function fetchPolizas() {
    setLoading(true)
    const { data } = await supabase.from('polizas').select('*, clientes(nombre)').order('created_at', { ascending: false })
    if (data) {
      const ids = data.map((p: any) => p.id)
      const { data: docs } = await supabase.from('documentos').select('poliza_id').in('poliza_id', ids)
      const countMap: Record<string, number> = {}
      ;(docs || []).forEach((d: any) => { countMap[d.poliza_id] = (countMap[d.poliza_id] || 0) + 1 })
      setPolizas(data.map((p: any) => ({ ...p, doc_count: countMap[p.id] || 0 })))
    }
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchCatalogos() {
    const [r, c, co, m] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x:any) => x.nombre),
      companias: (c.data || []).map((x:any) => x.nombre),
      corredores:(co.data || []).map((x:any) => x.nombre),
      monedas:   (m.data || []).map((x:any) => x.nombre),
    })
  }

  const [detalleExtras, setDetalleExtras] = useState<{nombre:string;valor:string}[]>([])

  async function abrirDetalle(p: Poliza) {
    setDetalle(p)
    setLoadingDetalle(true)
    const [{ data: docs }, { data: pagos }, { data: extras }] = await Promise.all([
      supabase.from('documentos').select('*').eq('poliza_id', p.id).order('created_at', { ascending: false }),
      supabase.from('pagos').select('*').eq('poliza_id', p.id).order('cuota_num'),
      supabase.from('poliza_campos').select('valor, campos_ramo(nombre)').eq('poliza_id', p.id),
    ])
    setDetalleDocs(docs || [])
    setDetallePagos(pagos || [])
    setDetalleExtras((extras || []).map((e: any) => ({ nombre: e.campos_ramo?.nombre || '', valor: e.valor })).filter(e => e.nombre && e.valor))
    setLoadingDetalle(false)
  }

  async function descargarDoc(doc: Documento) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminarDoc(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    if (detalle) abrirDetalle(detalle)
  }

  async function registrarPago(cuotaNum: number) {
    if (!detalle) return
    setSavingPago(true)
    await supabase.from('pagos').upsert([{
      poliza_id:  detalle.id,
      cuota_num:  cuotaNum,
      fecha:      pagoForm.fecha,
      metodo:     pagoForm.metodo,
      referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' })
    setShowPagoModal(null)
    setSavingPago(false)
    await abrirDetalle(detalle)
    // Refresh polizas list in background
    fetchPolizas()
  }

  async function deshacerPago(cuotaNum: number) {
    if (!detalle) return
    if (!confirm('¿Deshacer este pago?')) return
    await supabase.from('pagos').delete().eq('poliza_id', detalle.id).eq('cuota_num', cuotaNum)
    await abrirDetalle(detalle)
    fetchPolizas()
  }

  async function eliminarPoliza(p: Poliza) {
    if (!confirm(`¿Eliminar la póliza ${p.numero}? Se eliminarán también sus cuotas y documentos.`)) return
    await supabase.from('polizas').delete().eq('id', p.id)
    await fetchPolizas()
  }

  async function guardarEdicion() {
    if (!editando) return
    setSavingEdit(true)
    await supabase.from('polizas').update({
      numero:      editForm.numero,
      ramo:        editForm.ramo,
      compania:    editForm.compania,
      corredor:    editForm.corredor,
      moneda:      editForm.moneda,
      vencimiento: editForm.vencimiento || null,
      nota:        editForm.nota || null,
    }).eq('id', editando.id)
    // Save/update campos dinamicos
    if (editCamposRamo.length > 0) {
      const upserts = Object.entries(editValores)
        .filter(([_, v]) => v.trim())
        .map(([campoId, valor]) => ({ poliza_id: editando.id, campo_id: campoId, valor }))
      if (upserts.length > 0) {
        await supabase.from('poliza_campos').upsert(upserts, { onConflict: 'poliza_id,campo_id' })
      }
      // Delete removed values
      const camposConValor = Object.entries(editValores).filter(([_,v]) => !v.trim()).map(([id]) => id)
      if (camposConValor.length > 0) {
        await supabase.from('poliza_campos').delete().eq('poliza_id', editando.id).in('campo_id', camposConValor)
      }
    }
    setEditando(null)
    setSavingEdit(false)
    await fetchPolizas()
  }

  async function guardarPoliza() {
    if (!clienteSeleccionado || !form.numero.trim()) return
    const nCuotas = parseInt(form.cuotas) || 0
    if (nCuotas < 1) { alert('Ingresá al menos 1 cuota'); return }
    if (!form.fechasCuotas[0]) { alert('Ingresá la fecha de la primera cuota'); return }
    setSaving(true)
    const { data: polData } = await supabase.from('polizas').insert([{
      cliente_id:  clienteSeleccionado.id,
      ramo: form.ramo, compania: form.compania, numero: form.numero,
      vencimiento: form.vencimiento || null, corredor: form.corredor,
      moneda: form.moneda, cuotas: nCuotas,
      cuota_mes: fechasACuotaMes(form.fechasCuotas), nota: form.nota || null,
    }]).select().single()
    if (polData) {
      const inserts = Object.entries(valoresCampos)
        .filter(([_, v]) => v.trim())
        .map(([campoId, valor]) => ({ poliza_id: (polData as any).id, campo_id: campoId, valor }))
      if (inserts.length > 0) await supabase.from('poliza_campos').insert(inserts)
    }
    cerrarModal()
    setSaving(false)
    await fetchPolizas()
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSeleccionado(null)
    setForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '' })
    setCamposRamo([])
    setValoresCampos({})
    setShowModal(true)
  }
  function cerrarModal() { setShowModal(false); setClienteSeleccionado(null); setPaso('cliente') }

  const RAMOS_FILTRO = ['Todos', ...catalogos.ramos]
  const filtradas = polizas.filter(p => {
    const q = search.toLowerCase()
    const nombre = p.clientes?.nombre || ''
    return (!q || nombre.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q) || p.ramo.toLowerCase().includes(q)) &&
           (filtroRamo === 'Todos' || p.ramo === filtroRamo)
  })
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  // ── DETALLE VIEW ──────────────────────────────────────────────────────────
  if (detalle) {
    const { label, cls } = estadoBadge(detalle.vencimiento)
    const pagosMap: Record<number, Pago> = {}
    detallePagos.forEach(pg => { pagosMap[pg.cuota_num] = pg })
    const pct = detalle.cuotas > 0 ? Math.round(detallePagos.length / detalle.cuotas * 100) : 0

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Pólizas</h1>
            <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>{detalle.ramo} · {detalle.numero}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
            <ArrowLeft size={14} /> Volver a pólizas
          </button>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseDown={e => { e.stopPropagation() }}
            onClick={e => {
              e.stopPropagation()
              setEditando(detalle)
              setEditForm({ numero: detalle.numero, ramo: detalle.ramo, compania: detalle.compania, corredor: detalle.corredor, moneda: detalle.moneda, vencimiento: detalle.vencimiento, nota: detalle.nota })
              supabase.from('ramos').select('id').eq('nombre', detalle.ramo).single().then(({ data: ramoData }) => {
                if (!ramoData) { setEditCamposRamo([]); setEditValores({}); return }
                Promise.all([
                  supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden'),
                  supabase.from('poliza_campos').select('campo_id, valor').eq('poliza_id', detalle.id),
                ]).then(([{ data: campos }, { data: valores }]) => {
                  setEditCamposRamo(campos || [])
                  const map: Record<string,string> = {}
                  ;(valores || []).forEach((v: any) => { map[v.campo_id] = v.valor })
                  setEditValores(map)
                })
              })
            }}>
            <Pencil size={14} /> Editar póliza
          </button>
        </div>

        {/* Header card */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="badge badge-neutral" style={{ fontSize: 13 }}>{detalle.ramo}</span>
                <span className={`badge ${cls}`}>{label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>{detalle.numero}</div>
              <div style={{ fontSize: 14, color: 'var(--slate)', marginTop: 4 }}>{detalle.clientes?.nombre}</div>
              {detalle.nota && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--navy)', background: '#F4F7FB', borderLeft: '3px solid var(--gold)', padding: '6px 12px', borderRadius: 6 }}>
                  {detalle.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Compañía',    value: detalle.compania },
                { label: 'Corredor',    value: detalle.corredor },
                { label: 'Moneda',      value: detalle.moneda },
                { label: 'Vencimiento', value: formatFecha(detalle.vencimiento) },
                { label: 'Cuotas',      value: detalle.cuotas || '—' },
                { label: 'Pagadas',     value: `${detallePagos.length}/${detalle.cuotas}` },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campos extra por ramo */}
        {detalleExtras.length > 0 && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 12 }}>
              Datos específicos — {detalle.ramo}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {detalleExtras.map(e => (
                <div key={e.nombre}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 2 }}>{e.nombre}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{formatValor(e.valor)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuotas */}
        {detalle.cuotas > 0 && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)' }}>
                Cuotas <span style={{ fontWeight: 400 }}>({detallePagos.length}/{detalle.cuotas} pagadas)</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? 'var(--success)' : 'var(--slate)' }}>{pct}%</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, marginBottom: 14 }}>
              <div style={{ background: pct === 100 ? 'var(--success)' : 'var(--gold)', height: '100%', borderRadius: 4, width: `${pct}%`, transition: 'width .4s' }} />
            </div>
            {/* Parse cuota_mes to show dates */}
            {detalle.cuota_mes && detalle.cuota_mes.split(' - ').map((item, i) => {
              const n = i + 1
              const pago = pagosMap[n]
              const fechaStr = item.split('/').slice(1).join('/')
              return (
                <div key={n} className={`cuota-row ${pago ? 'paid' : ''}`}>
                  <div className={`cuota-num ${pago ? 'paid' : 'pending'}`}>{n}</div>
                  <div className="cuota-info">
                    <div className="cuota-title">Cuota {n} — {fechaStr}</div>
                    <div className="cuota-sub">{pago ? `Pagado ${pago.fecha} · ${pago.metodo}` : 'Pendiente'}</div>
                  </div>
                  {pago ? (
                    <>
                      <span className="cuota-paid-tag">Pagada</span>
                      <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6 }}
                        onClick={() => deshacerPago(n)}>Deshacer</button>
                    </>
                  ) : (
                    <button className="btn-primary btn-sm"
                      onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: metodos[0] || 'Transferencia', referencia: '' }); setShowPagoModal(n) }}>
                      + Registrar pago
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Documentos */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            Documentos {detalleDocs.length > 0 && `(${detalleDocs.length})`}
          </div>
          {loadingDetalle ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>Cargando...</div>
          ) : detalleDocs.length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>Sin documentos adjuntos</div>
          ) : detalleDocs.map(doc => {
            const ext = extStyle[getExt(doc.nombre)] || extStyle.pdf
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5FB' }}>
                <div style={{ width: 34, height: 34, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 1 }}>{doc.tipo} · {formatBytes(doc.tamanio_bytes)}</div>
                </div>
                <button className="btn-outline btn-sm" onClick={() => descargarDoc(doc)}><Download size={13} /></button>
                <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminarDoc(doc)}><Trash2 size={13} /></button>
              </div>
            )
          })}
        </div>

      {/* Modal editar póliza */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar póliza</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup"><label>N° Póliza</label>
                <input value={editForm.numero || ''} onChange={e => setEditForm(p => ({...p, numero: e.target.value}))} /></div>
              <div className="fgroup"><label>Ramo</label>
                <select value={editForm.ramo || ''} onChange={async e => {
                  const nuevoRamo = e.target.value
                  setEditForm(p => ({...p, ramo: nuevoRamo}))
                  setEditValores({})
                  if (nuevoRamo) {
                    const { data: rd } = await supabase.from('ramos').select('id').eq('nombre', nuevoRamo).single()
                    if (rd) { const { data: c } = await supabase.from('campos_ramo').select('*').eq('ramo_id', rd.id).order('orden'); setEditCamposRamo(c || []) }
                    else setEditCamposRamo([])
                  } else setEditCamposRamo([])
                }}>
                  {catalogos.ramos.map((r:string) => <option key={r}>{r}</option>)}
                </select></div>
              <div className="fgroup"><label>Compañía</label>
                <select value={editForm.compania || ''} onChange={e => setEditForm(p => ({...p, compania: e.target.value}))}>
                  {catalogos.companias.map((c:string) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Corredor</label>
                <select value={editForm.corredor || ''} onChange={e => setEditForm(p => ({...p, corredor: e.target.value}))}>
                  {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Vencimiento</label>
                <DatePicker value={editForm.vencimiento || ''} onChange={v => setEditForm(p => ({...p, vencimiento: v}))} /></div>
              <div className="fgroup"><label>Moneda</label>
                <select value={editForm.moneda || ''} onChange={e => setEditForm(p => ({...p, moneda: e.target.value}))}>
                  {catalogos.monedas.map((m:string) => <option key={m}>{m}</option>)}
                </select></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nota (opcional)</label>
                <textarea value={editForm.nota || ''} onChange={e => setEditForm(p => ({...p, nota: e.target.value}))} rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>
            {editCamposRamo.length > 0 && (
              <div style={{ background: '#F4F7FB', borderRadius: 10, padding: '14px', marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 12 }}>
                  Datos específicos — {editForm.ramo}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  {editCamposRamo.map((campo: any) => (
                    <div key={campo.id} className="fgroup">
                      <label>{campo.nombre}</label>
                      {campo.tipo === 'numero_moneda' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <select value={(editValores[campo.id] || '').split('|')[1] || 'U$S'}
                            onChange={e => { const m = (editValores[campo.id] || '').split('|')[0] || ''; setEditValores(p => ({...p, [campo.id]: `${m}|${e.target.value}`})) }}
                            style={{ flex: 1, minWidth: 70 }}><option>U$S</option><option>$</option><option>€</option></select>
                          <input type="number" value={(editValores[campo.id] || '').split('|')[0] || ''}
                            onChange={e => { const mon = (editValores[campo.id] || '').split('|')[1] || 'U$S'; setEditValores(p => ({...p, [campo.id]: `${e.target.value}|${mon}`})) }}
                            placeholder="0" style={{ flex: 3 }} />
                        </div>
                      ) : campo.tipo === 'select' && campo.opciones ? (
                        <select value={editValores[campo.id] || ''} onChange={e => setEditValores(p => ({...p, [campo.id]: e.target.value}))}
                          style={{ color: editValores[campo.id] ? 'var(--navy)' : 'var(--slate)' }}>
                          <option value="">— Seleccionar —</option>
                          {campo.opciones.split(',').map((o: string) => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                        </select>
                      ) : campo.tipo === 'boolean' ? (
                        <select value={editValores[campo.id] || ''} onChange={e => setEditValores(p => ({...p, [campo.id]: e.target.value}))}>
                          <option value="">— Seleccionar —</option><option>Sí</option><option>No</option>
                        </select>
                      ) : (
                        <input type={campo.tipo === 'numero' ? 'number' : 'text'} value={editValores[campo.id] || ''}
                          onChange={e => setEditValores(p => ({...p, [campo.id]: e.target.value}))} placeholder={campo.nombre} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit}>
                {savingEdit ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Pólizas</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>{loading ? 'Cargando...' : `${polizas.length} pólizas en cartera`}</p>
        </div>
        <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nueva póliza</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RAMOS_FILTRO.map(t => <button key={t} onClick={() => setFiltroRamo(t)} className={`filter-btn ${filtroRamo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>

      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} />
            <col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 80 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th>N° Póliza</th><th>Cliente</th><th>Ramo</th>
              <th>Compañía</th><th>Vencimiento</th><th>Moneda</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pólizas</div>
              </td></tr>
            ) : filtradas.map(p => {
              const { label, cls } = estadoBadge(p.vencimiento)
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => abrirDetalle(p)}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{p.numero}</td>
                  <td style={{ fontWeight: 600 }}>{p.clientes?.nombre || '—'}</td>
                  <td><span className="badge badge-neutral">{p.ramo}</span></td>
                  <td style={{ color: 'var(--slate)', fontSize: 13 }}>{p.compania}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatFecha(p.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{p.moneda}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${cls}`}>{label}</span>
                      {(p.doc_count ?? 0) > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--slate)', fontSize: 11 }}>
                          <Paperclip size={11} />{p.doc_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-outline btn-sm"
                      style={{ color: 'var(--danger)', borderColor: '#FEE2E2', fontSize: 12 }}
                      onClick={() => eliminarPoliza(p)}>
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtradas.map(p => {
            const { label, cls } = estadoBadge(p.vencimiento)
            return (
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }} onClick={() => abrirDetalle(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.clientes?.nombre || '—'}</div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{p.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{p.numero}</span>
                  {' · '}{p.compania}
                  {(p.doc_count ?? 0) > 0 && <span style={{ marginLeft: 8 }}><Paperclip size={11} /> {p.doc_count}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal nueva póliza */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : 'Nueva póliza'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : '2'} de 2{paso === 'poliza' && clienteSeleccionado ? ` — ${clienteSeleccionado.nombre}` : ''}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza'].map((p, i) => {
                const idx = ['cliente','poliza'].indexOf(paso)
                return <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= idx ? 'var(--gold)' : 'var(--border)', transition: 'background .2s' }} />
              })}
            </div>

            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--navy)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSeleccionado(c); setPaso('poliza') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{c.direccion}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {paso === 'poliza' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <div className="fgroup">
                    <label>Ramo *</label>
                    <select value={form.ramo} onChange={async e => {
                      const nuevoRamo = e.target.value
                      setForm({ ...form, ramo: nuevoRamo })
                      setValoresCampos({})
                      if (nuevoRamo) {
                        const { data: ramoData } = await supabase.from('ramos').select('id').eq('nombre', nuevoRamo).single()
                        if (ramoData) {
                          const { data } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden')
                          setCamposRamo(data || [])
                        } else setCamposRamo([])
                      } else setCamposRamo([])
                    }} style={{ color: form.ramo ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.ramos.map((r:string) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>N° Póliza *</label>
                    <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Ej: 4309338" autoFocus />
                  </div>
                  <div className="fgroup">
                    <label>Compañía *</label>
                    <select value={form.compania} onChange={e => setForm({ ...form, compania: e.target.value })} style={{ color: form.compania ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.companias.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Corredor *</label>
                    <select value={form.corredor} onChange={e => setForm({ ...form, corredor: e.target.value })} style={{ color: form.corredor ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Vencimiento *</label>
                    <DatePicker value={form.vencimiento} onChange={v => setForm({ ...form, vencimiento: v })} placeholder="Seleccionar fecha" />
                  </div>
                  <div className="fgroup">
                    <label>Moneda *</label>
                    <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })} style={{ color: form.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.monedas || []).map((m:string) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Cantidad de cuotas *</label>
                    <input type="number" min="1" max="36" value={form.cuotas} onChange={e => setForm({ ...form, cuotas: e.target.value, fechasCuotas: [] })} placeholder="Ej: 10" />
                  </div>
                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Fechas de vencimiento por cuota *<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--slate)', marginLeft: 6 }}>— ingresá la cantidad de cuotas primero</span></label>
                    <CuotasFechas cuotas={parseInt(form.cuotas) || 0} value={form.fechasCuotas} onChange={v => setForm({ ...form, fechasCuotas: v })} />
                  </div>
                  {camposRamo.length > 0 && (
                    <div style={{ gridColumn: 'span 2', background: '#F4F7FB', borderRadius: 10, padding: '14px', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 12 }}>
                        Datos específicos de {form.ramo}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                        {camposRamo.map(campo => (
                          <div key={campo.id} className="fgroup">
                            <label>{campo.nombre}</label>
                            {campo.tipo === 'select' && campo.opciones ? (
                              <select value={valoresCampos[campo.id] || ''} onChange={e => setValoresCampos(p => ({...p, [campo.id]: e.target.value}))}
                                style={{ color: valoresCampos[campo.id] ? 'var(--navy)' : 'var(--slate)' }}>
                                <option value="">— Seleccionar —</option>
                                {campo.opciones.split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                              </select>
                        ) : campo.tipo === 'numero_moneda' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <select
                              value={(valoresCampos[campo.id] || '').split('|')[1] || 'U$S'}
                              onChange={e => {
                                const monto = (valoresCampos[campo.id] || '').split('|')[0] || ''
                                setValoresCampos(p => ({...p, [campo.id]: `${monto}|${e.target.value}`}))
                              }}
                              style={{ flex: 1, minWidth: 70 }}>
                              <option>U$S</option>
                              <option>$</option>
                              <option>€</option>
                            </select>
                            <input type="number"
                              value={(valoresCampos[campo.id] || '').split('|')[0] || ''}
                              onChange={e => {
                                const moneda = (valoresCampos[campo.id] || '').split('|')[1] || 'U$S'
                                setValoresCampos(p => ({...p, [campo.id]: `${e.target.value}|${moneda}`}))
                              }}
                              placeholder="0" style={{ flex: 3 }} />
                          </div>
                            ) : campo.tipo === 'boolean' ? (
                              <select value={valoresCampos[campo.id] || ''} onChange={e => setValoresCampos(p => ({...p, [campo.id]: e.target.value}))}
                                style={{ color: valoresCampos[campo.id] ? 'var(--navy)' : 'var(--slate)' }}>
                                <option value="">— Seleccionar —</option>
                                <option value="Sí">Sí</option>
                                <option value="No">No</option>
                              </select>
                            ) : campo.tipo === 'fecha' ? (
                              <DatePicker value={valoresCampos[campo.id] || ''} onChange={v => setValoresCampos(p => ({...p, [campo.id]: v}))} />
                            ) : (
                              <input type={campo.tipo === 'numero' ? 'number' : 'text'}
                                value={valoresCampos[campo.id] || ''}
                                onChange={e => setValoresCampos(p => ({...p, [campo.id]: e.target.value}))}
                                placeholder={campo.nombre} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--slate)' }}>(opcional)</span></label>
                    <textarea value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} placeholder="Descripción del bien asegurado" rows={2}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)', lineHeight: 1.5 }}
                      onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={guardarPoliza} disabled={saving || !form.numero.trim()}>
                      {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar póliza'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Modal registrar pago */}
      {showPagoModal !== null && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPagoModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar pago</h3>
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {(detalle as any)?.ramo} · {(detalle as any)?.numero} · Cuota {showPagoModal}
            </div>
            <div className="fgroup">
              <label>Fecha de pago</label>
              <DatePicker value={pagoForm.fecha} onChange={v => setPagoForm({ ...pagoForm, fecha: v })} />
            </div>
            <div className="fgroup">
              <label>Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {metodos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup">
              <label>Referencia</label>
              <input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Comprobante (opcional)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => registrarPago(showPagoModal!)} disabled={savingPago}>
                {savingPago ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}


FILEEOF
git add .
git commit -m 'feat: columna Accion con boton Eliminar en tabla polizas'
git push
