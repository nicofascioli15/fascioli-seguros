#!/bin/bash
set -e
mkdir -p 'app/(app)/polizas' 'app/(app)/clientes'
cat > 'app/(app)/polizas/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, X, Loader2, Paperclip, ArrowLeft, FileText, CreditCard, Bell, Upload, Download, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'

// Catalogs loaded from Supabase

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
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

        <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0 }}>
          <ArrowLeft size={14} /> Volver a pólizas
        </button>

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
            <col style={{ width: 130 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} />
            <col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 80 }} /><col style={{ width: 130 }} />
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
echo '+ app/(app)/polizas/page.tsx'

cat > 'app/(app)/clientes/ClienteDetalle.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, X, ChevronRight, Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import DatePicker from '@/components/DatePicker'

type Documento = {
  id: string
  nombre: string
  storage_path: string
  tipo: string
  tamanio_bytes: number
}

type Poliza = {
  id: string
  ramo: string
  compania: string
  numero: string
  vencimiento: string | null
  corredor: string
  moneda: string
  cuotas: number
  cuota_mes: string
  nota: string
  poliza_campos?: {valor:string; campos_ramo:{nombre:string}}[]
  pagos?: Record<number, { id: string; fecha: string; metodo: string; referencia: string }>
  documentos?: Documento[]
}

type Props = { id: string; nombre: string; onBack: () => void }

// Convierte array de fechas a string legible para almacenar
function fechasACuotaMes(fechas: string[]): string {
  return fechas.map((f, i) => {
    if (!f) return `${i+1}/?`
    const [y,m,d] = f.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
  }).join(' - ')
}

// Feriados inamovibles de Uruguay (MM-DD)
const FERIADOS_UY = ['01-01', '05-01', '07-18', '08-25', '12-25']

function esFeriado(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return FERIADOS_UY.includes(`${mm}-${dd}`)
}

// Si la fecha cae en finde o feriado, avanza al siguiente día hábil
function siguienteDiaHabil(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  while (date.getDay() === 0 || date.getDay() === 6 || esFeriado(date)) {
    date.setDate(date.getDate() + 1)
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

// Suma N meses manteniendo el mismo día, ajusta al próximo día hábil
function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthRaw = m - 1 + months
  const targetYear  = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay  = new Date(targetYear, targetMonth + 1, 0).getDate()
  const finalDay = Math.min(d, maxDay)
  const raw = `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(finalDay).padStart(2,'0')}`
  return siguienteDiaHabil(raw)
}

function CuotasFechas({ cuotas, value, onChange }: {
  cuotas: number
  value: string[]
  onChange: (v: string[]) => void
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
    // If changing first date, auto-fill all subsequent empty ones
    if (idx === 0 && val) {
      for (let i = 1; i < cuotas; i++) {
        // Only auto-fill if not manually set yet
        if (!next[i]) {
          next[i] = addMonthsAndDays(val, i)
        }
      }
    }
    onChange(next)
  }

  function autoFillAll(firstDate: string) {
    const next = Array.from({ length: cuotas }, (_, i) => addMonthsAndDays(firstDate, i))
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
      {dates.map((fecha, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: fecha ? 'var(--navy)' : '#EEF2F8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
            color: fecha ? 'var(--gold)' : 'var(--slate)',
          }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <DatePicker
              value={fecha}
              onChange={val => handleChange(i, val)}
              placeholder={i === 0 ? 'Fecha 1ª cuota (auto-completa las siguientes)' : `Fecha cuota ${i + 1}`}
            />
          </div>
          {i === 0 && fecha && cuotas > 1 && (
            <button
              onClick={() => autoFillAll(fecha)}
              title="Recalcular todas las fechas desde la primera"
              style={{
                flexShrink: 0, padding: '5px 10px', border: '1.5px solid var(--border)',
                borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: 11,
                fontWeight: 600, color: 'var(--slate)', whiteSpace: 'nowrap',
                transition: 'all .12s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)' }}
            >
              Recalcular
            </button>
          )}
        </div>
      ))}
      {dates.some(d => d) && dates.some(d => !d) && (
        <div style={{ fontSize: 11.5, color: 'var(--warning)', marginTop: 2 }}>
          Hay cuotas sin fecha — completalas o usá "Recalcular"
        </div>
      )}
    </div>
  )
}

function diasHasta(str: string | null): number | null {
  if (!str) return null
  const d = new Date(str)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(iso: string | null) {
  if (!iso) return 'Sin fecha'
  const [y, m, d] = iso.split('-')
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

function ramoDot(ramo: string) {
  const map: Record<string, string> = {
    'Incendio':'#D94F4F','Multirriesgo':'#2563EB','Ascensores':'#16A34A',
    'Inmuebles':'#D97706','Cristales':'#0284C7','Vehículos':'#7C3AED','RC':'#9333EA','Vida':'#0891B2'
  }
  return map[ramo] || '#8A9BB5'
}

export default function ClienteDetalle({ id, nombre, onBack }: Props) {
  const [polizas, setPolizas]         = useState<Poliza[]>([])
  const [loading, setLoading]         = useState(true)
  const [openCards, setOpenCards]     = useState<Record<string, boolean>>({})
  const [showPolizaModal, setShowPolizaModal] = useState(false)
  const [showTipoDocModal, setShowTipoDocModal] = useState(false)
  const [showPagoModal, setShowPagoModal]     = useState<{ polizaId: string; cuotaNum: number; ramo: string } | null>(null)
  const [savingPoliza, setSavingPoliza] = useState(false)
  const [savingPago, setSavingPago]    = useState(false)
  const [polizaForm, setPolizaForm]   = useState({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: '' })
  const [pagoForm, setPagoForm]       = useState({ fecha: new Date().toISOString().slice(0, 10), metodo: 'Transferencia', referencia: '' })
  const [errores, setErrores]         = useState<Record<string, boolean>>({})
  const supabase                      = createClient()
  const [catalogos, setCatalogos]     = useState<{
    ramos: string[]; companias: string[]; corredores: string[]; metodos: string[]; monedas: string[]
  }>({ ramos: [], companias: [], corredores: [], metodos: [], monedas: [] })
  const [nuevoCorreder, setNuevoCorreder] = useState('')
  const [showNuevoCorreder, setShowNuevoCorreder] = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const [tiposDoc, setTiposDoc]       = useState<string[]>([])
  const [camposRamo, setCamposRamo]   = useState<{id:string;nombre:string;tipo:string;opciones:string|null}[]>([])
  const [valoresCampos, setValoresCampos] = useState<Record<string,string>>({})
  const [tipoDocSel, setTipoDocSel]   = useState('Póliza')
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null) // poliza id being uploaded
  const [uploadPolizaSel, setUploadPolizaSel] = useState<{ id: string; ramo: string; numero: string } | null>(null)
  const [toast, setToast]             = useState<string | null>(null)

  useEffect(() => { fetchPolizas(); fetchCatalogos() }, [id])

  async function fetchPolizas() {
    setLoading(true)
    const { data: polData } = await supabase
      .from('polizas')
      .select('*')
      .eq('cliente_id', id)
      .order('created_at')

    if (!polData) { setLoading(false); return }

    // Load pagos for all polizas
    const polizaIds = polData.map(p => p.id)
    const { data: pagosData } = await supabase
      .from('pagos')
      .select('*')
      .in('poliza_id', polizaIds)

    // Load documentos for all polizas
    const { data: docsData } = await supabase
      .from('documentos')
      .select('id, nombre, storage_path, tipo, tamanio_bytes, poliza_id')
      .in('poliza_id', polizaIds)

    const polizasConPagos: Poliza[] = polData.map(p => {
      const pagosPol = (pagosData || []).filter(pg => pg.poliza_id === p.id)
      const pagosMap: Record<number, any> = {}
      pagosPol.forEach(pg => { pagosMap[pg.cuota_num] = pg })
      const docs = (docsData || []).filter((d: any) => d.poliza_id === p.id)
      return { ...p, pagos: pagosMap, documentos: docs }
    })

    setPolizas(polizasConPagos)
    setLoading(false)
  }

  async function fetchCatalogos() {
    const [r, c, co, m, mon] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('metodos_pago').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x: any) => x.nombre),
      companias: (c.data || []).map((x: any) => x.nombre),
      corredores:(co.data || []).map((x: any) => x.nombre),
      metodos:   (m.data || []).map((x: any) => x.nombre),
      monedas:   (mon.data || []).map((x: any) => x.nombre),
    })
    // Also load tipos doc separately for upload
    const td = await supabase.from('tipos_documento').select('nombre').order('nombre')
    if (td.data) setTiposDoc(td.data.map((x: any) => x.nombre))
  }

  async function crearCorredor() {
    const nombre = nuevoCorreder.trim()
    if (!nombre) return
    await supabase.from('corredores').insert([{ nombre }])
    setNuevoCorreder('')
    setShowNuevoCorreder(false)
    await fetchCatalogos()
    setPolizaForm(prev => ({ ...prev, corredor: nombre }))
    showToast(`Corredor "${nombre}" creado`)
  }

  async function guardarPoliza() {
    const nCuotas = parseInt(polizaForm.cuotas) || 0
    const errs: Record<string, boolean> = {}
    if (!polizaForm.numero.trim())  errs.numero = true
    if (!polizaForm.ramo)           errs.ramo = true
    if (!polizaForm.compania)       errs.compania = true
    if (!polizaForm.compania)       errs.compania = true
    if (!polizaForm.corredor)       errs.corredor = true
    if (!polizaForm.moneda)         errs.moneda = true
    if (!polizaForm.vencimiento)    errs.vencimiento = true
    if (nCuotas < 1)                errs.cuotas = true
    if (nCuotas > 0 && !polizaForm.fechasCuotas[0]) errs.fecha_cuota_0 = true
    if (nCuotas > 0) {
      polizaForm.fechasCuotas.slice(0, nCuotas).forEach((f, i) => {
        if (!f) errs[`fecha_cuota_${i}`] = true
      })
    }
    if (Object.keys(errs).length > 0) {
      setErrores(errs)
      showToast('Completá todos los campos obligatorios')
      return
    }
    setErrores({})
    setSavingPoliza(true)
    const { error, data: polData } = await supabase.from('polizas').insert([{
      cliente_id:   id,
      ramo:         polizaForm.ramo,
      compania:     polizaForm.compania,
      numero:       polizaForm.numero,
      vencimiento:  polizaForm.vencimiento || null,
      corredor:     polizaForm.corredor,
      moneda:       polizaForm.moneda,
      cuotas:       parseInt(polizaForm.cuotas) || 0,
      cuota_mes:    fechasACuotaMes(polizaForm.fechasCuotas),
      nota:         polizaForm.nota || null,
    }])
    if (!error) {
      setShowPolizaModal(false)
      setPolizaForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '' })
    setCamposRamo([])
    setValoresCampos({})
      await fetchPolizas()
    }
    setSavingPoliza(false)
  }

  async function registrarPago() {
    if (!showPagoModal) return
    setSavingPago(true)
    const { error, data: pagoData } = await supabase.from('pagos').upsert([{
      poliza_id:  showPagoModal.polizaId,
      cuota_num:  showPagoModal.cuotaNum,
      fecha:      pagoForm.fecha,
      metodo:     pagoForm.metodo,
      referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' }).select().single()
    if (!error) {
      await registrarAudit({ accion: 'crear', tabla: 'pagos', registroId: (pagoData as any)?.id, descripcion: `Pago registrado: cuota ${showPagoModal.cuotaNum} — ${showPagoModal.ramo} — ${nombre}`, datosDespues: pagoData })
      setShowPagoModal(null)
      await fetchPolizas()
    }
    setSavingPago(false)
  }

  async function deshacerPago(polizaId: string, cuotaNum: number) {
    await supabase.from('pagos').delete().eq('poliza_id', polizaId).eq('cuota_num', cuotaNum)
    await fetchPolizas()
  }

  async function eliminarPoliza(polizaId: string) {
    if (!confirm('¿Eliminar esta póliza?')) return
    const { data: polAntes } = await supabase.from('polizas').select('*').eq('id', polizaId).single()
    await supabase.from('polizas').delete().eq('id', polizaId)
    await registrarAudit({ accion: 'eliminar', tabla: 'polizas', registroId: polizaId, descripcion: `Póliza eliminada: ${polAntes?.ramo} ${polAntes?.numero} — ${nombre}`, datosAntes: polAntes })
    await fetchPolizas()
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function abrirDocumento(doc: Documento) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminarDocumento(doc: Documento, polizaNombre: string) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    await fetchPolizas()
    showToast(`"${doc.nombre}" eliminado`)
  }

  async function subirDocumento(file: File, poliza: { id: string; ramo: string; numero: string }) {
    setUploadingDoc(poliza.id)
    const path = `${id}/${poliza.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`

    const { error: storageErr } = await supabase.storage
      .from('documentos')
      .upload(path, file, { upsert: false })

    if (storageErr) {
      showToast(`Error al subir: ${storageErr.message}`)
      setUploadingDoc(null)
      return
    }

    await supabase.from('documentos').insert([{
      nombre:        file.name,
      tipo:          tipoDocSel,
      storage_path:  path,
      tamanio_bytes: file.size,
      cliente_id:    id,
      poliza_id:     poliza.id,
    }])

    setUploadingDoc(null)
    setUploadPolizaSel(null)
    await fetchPolizas()
    showToast(`"${file.name}" subido correctamente`)
  }

  const vencidas = polizas.filter(p => diasHasta(p.vencimiento) !== null && (diasHasta(p.vencimiento) ?? 1) < 0).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>{nombre}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowPolizaModal(true)}>
          <Plus size={15} /> Nueva póliza
        </button>
      </div>

      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={14} /> Volver a clientes
      </button>

      {/* Info card */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{nombre}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: '8px 16px', background: '#EEF2F8', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{polizas.length}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)' }}>Pólizas</div>
          </div>
          {vencidas > 0 && (
            <div style={{ textAlign: 'center', padding: '8px 16px', background: '#FEE2E2', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#991B1B' }}>{vencidas}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#991B1B' }}>Vencidas</div>
            </div>
          )}
        </div>
      </div>

      {/* Pólizas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando pólizas...
        </div>
      ) : polizas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin pólizas aún</div>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => setShowPolizaModal(true)}>
            <Plus size={14} /> Agregar primera póliza
          </button>
        </div>
      ) : polizas.map(pol => {
        const { label, cls } = estadoBadge(pol.vencimiento)
        const cuotasN        = pol.cuotas || 0
        const pagosCount     = Object.keys(pol.pagos || {}).length
        const pct            = cuotasN > 0 ? Math.round(pagosCount / cuotasN * 100) : 0
        const isOpen         = openCards[pol.id]

        return (
          <div key={pol.id} className="poliza-card" style={{ transition: 'box-shadow .25s ease', boxShadow: isOpen ? '0 4px 20px rgba(15,30,53,.1)' : 'none' }}>
            <div className="poliza-card-header" onClick={() => setOpenCards(prev => ({ ...prev, [pol.id]: !prev[pol.id] }))}
              style={{ transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              <div className="ramo-dot" style={{ background: ramoDot(pol.ramo) }} />
              <div style={{ minWidth: 0 }}>
                <div className="poliza-ramo">{pol.ramo}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="poliza-id">{pol.numero}</div>
                  {pol.nota && (
                    <div style={{
                      fontSize: 11, color: 'var(--slate)', fontWeight: 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 260
                    }}>
                      {((s: string) => s.toLowerCase().replace(/\w/g, c => c.toUpperCase()))(pol.nota)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <span className="badge badge-neutral" style={{ marginRight: 8 }}>{pol.compania}</span>
              <span className={`badge ${cls}`}>{label}</span>
              <ChevronRight size={16} style={{ marginLeft: 10, color: 'var(--slate)', transition: 'transform .28s ease', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
            </div>

            <div
              className="poliza-card-body"
              style={{
                display: 'grid',
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows .28s ease',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div className="poliza-grid">
                  <div className="poliza-field"><div className="field-label">N° Póliza</div><div className="field-val" style={{ fontFamily: 'monospace' }}>{pol.numero}</div></div>
                  <div className="poliza-field"><div className="field-label">Vencimiento</div><div className="field-val">{formatFecha(pol.vencimiento)}</div></div>
                  <div className="poliza-field"><div className="field-label">Moneda</div><div className="field-val">{pol.moneda}</div></div>
                  <div className="poliza-field"><div className="field-label">Corredor</div><div className="field-val">{pol.corredor}</div></div>
                  <div className="poliza-field"><div className="field-label">Cuotas</div><div className="field-val">{pol.cuotas || '—'}</div></div>
                  <div className="poliza-field" style={{ gridColumn: 'span 3' }}>
                    <div className="field-label">Fechas de vencimiento</div>
                    {pol.cuota_mes ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', marginTop: 4 }}>
                        {pol.cuota_mes.split(' - ').map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: '#F4F7FB', borderRadius: 7, padding: '4px 10px',
                            fontSize: 12.5, fontWeight: 500, color: 'var(--navy)'
                          }}>
                            <span style={{ fontWeight: 800, color: 'var(--slate)', fontSize: 11, minWidth: 14 }}>{i+1}</span>
                            <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
                            <span>{item.split('/').slice(1).join('/')}</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className="field-val">—</div>}
                  </div>
                </div>
                {pol.nota && (
                  <div style={{ background: '#F4F7FB', borderRadius: 8, padding: '10px 14px', marginBottom: 12, borderLeft: '3px solid var(--gold)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 4 }}>Nota</div>
                    <div style={{ fontSize: 13.5, color: 'var(--navy)' }}>{((s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))(pol.nota)}</div>
                  </div>
                )}

                {cuotasN > 0 && (
                  <div className="cuotas-section">
                    <div className="cuotas-label">
                      <span>Cuotas <span style={{ fontWeight: 400, color: 'var(--slate)' }}>({pagosCount}/{cuotasN} pagadas)</span></span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? 'var(--success)' : 'var(--slate)' }}>{pct}%</span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, marginBottom: 12 }}>
                      <div style={{ background: pct === 100 ? 'var(--success)' : 'var(--gold)', height: '100%', borderRadius: 4, width: `${pct}%`, transition: 'width .4s' }} />
                    </div>
                    {Array.from({ length: cuotasN }, (_, k) => k + 1).map(n => {
                      const pago = pol.pagos?.[n]
                      return (
                        <div key={n} className={`cuota-row ${pago ? 'paid' : ''}`}>
                          <div className={`cuota-num ${pago ? 'paid' : 'pending'}`}>{n}</div>
                          <div className="cuota-info">
                            <div className="cuota-title">Cuota {n} de {cuotasN}</div>
                            {pago
                              ? <div className="cuota-sub">{pago.fecha} · {pago.metodo}{pago.referencia ? ` · Ref: ${pago.referencia}` : ''}</div>
                              : <div className="cuota-sub">Pendiente de pago</div>
                            }
                          </div>
                          {pago
                            ? <>
                                <span className="cuota-paid-tag">Pagada</span>
                                <button className="btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => deshacerPago(pol.id, n)}>Deshacer</button>
                              </>
                            : <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0, 10), metodo: 'Transferencia', referencia: '' }); setShowPagoModal({ polizaId: pol.id, cuotaNum: n, ramo: pol.ramo }) }}>
                                + Registrar pago
                              </button>
                          }
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Documentos cargados */}
                {pol.documentos && pol.documentos.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 8 }}>
                      Documentos ({pol.documentos.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pol.documentos.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 16 }}>
                            {doc.nombre.endsWith('.pdf') ? '' : doc.nombre.match(/\.(jpg|jpeg|png)$/i) ? '' : ''}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--slate)' }}>{doc.tipo}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-primary btn-sm" onClick={() => abrirDocumento(doc)}>
                              Abrir
                            </button>
                            <button
                              className="btn-outline btn-sm"
                              style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }}
                              onClick={() => eliminarDocumento(doc, pol.numero)}
                              title="Eliminar documento"
                            >
                              Eliminar </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: pol.documentos && pol.documentos.length > 0 ? 12 : 12, borderTop: pol.documentos && pol.documentos.length > 0 ? 'none' : '1px solid var(--border)' }}>
                  <button
                    className="btn-outline btn-sm"
                    disabled={uploadingDoc === pol.id}
                    onClick={() => { setUploadPolizaSel({ id: pol.id, ramo: pol.ramo, numero: pol.numero }); setTipoDocSel('Póliza'); setShowTipoDocModal(true) }}
                  >
                    {uploadingDoc === pol.id
                      ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</>
                      : <><Upload size={13} /> Subir doc</>}
                  </button>
                  <button className="btn-outline btn-sm" style={{ marginLeft: 'auto', color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminarPoliza(pol.id)}>Eliminar póliza</button>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Modal nueva póliza */}
      {showPolizaModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPolizaModal(false) }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nueva póliza</h3>
              <button onClick={() => setShowPolizaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>Cliente: {nombre}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup">
                <label>Ramo *</label>
                <select value={polizaForm.ramo} onChange={e => {
                      const nuevoRamo = e.target.value
                      setPolizaForm({ ...polizaForm, ramo: nuevoRamo })
                      setErrores(p => ({...p, ramo: false}))
                      setValoresCampos({})
                      if (nuevoRamo) {
                        supabase.from('ramos').select('id').eq('nombre', nuevoRamo).single()
                          .then(({ data: ramoData }) => {
                            if (ramoData) {
                              supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden')
                                .then(({ data }) => setCamposRamo(data || []))
                            } else {
                              setCamposRamo([])
                            }
                          })
                      } else {
                        setCamposRamo([])
                      }
                    }}
                  style={{ borderColor: errores.ramo ? 'var(--danger)' : undefined, color: polizaForm.ramo ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar ramo —</option>
                  {catalogos.ramos.map((r: string) => <option key={r}>{r}</option>)}
                </select>
                {errores.ramo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>N° Póliza *</label>
                <input value={polizaForm.numero} onChange={e => { setPolizaForm({ ...polizaForm, numero: e.target.value }); setErrores(p => ({...p, numero: false})) }} placeholder="Ej: 4309338" autoFocus
                  style={{ borderColor: errores.numero ? 'var(--danger)' : undefined }} />
                {errores.numero && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Compañía *</label>
                <select value={polizaForm.compania} onChange={e => { setPolizaForm({ ...polizaForm, compania: e.target.value }); setErrores(p => ({...p, compania: false})) }}
                  style={{ borderColor: errores.compania ? 'var(--danger)' : undefined, color: polizaForm.compania ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar —</option>
                  {catalogos.companias.map((c: string) => <option key={c}>{c}</option>)}
                </select>
                {errores.compania && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Corredor</label>
                {showNuevoCorreder ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={nuevoCorreder} onChange={e => setNuevoCorreder(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && crearCorredor()}
                      placeholder="Nombre del corredor" autoFocus
                      style={{ flex: 1, padding: '10px 13px', border: '1.5px solid var(--gold)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: 'var(--navy)' }} />
                    <button className="btn-primary btn-sm" onClick={crearCorredor} style={{ padding: '8px 12px' }}></button>
                    <button className="btn-outline btn-sm" onClick={() => { setShowNuevoCorreder(false); setNuevoCorreder('') }} style={{ padding: '8px 12px' }}>×</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={polizaForm.corredor} onChange={e => { setPolizaForm({ ...polizaForm, corredor: e.target.value }); setErrores(p => ({...p, corredor: false})) }}
                      style={{ flex: 1, color: polizaForm.corredor ? 'var(--navy)' : 'var(--slate)', borderColor: errores.corredor ? 'var(--danger)' : undefined }}>
                      <option value="">— Seleccionar corredor —</option>
                      {catalogos.corredores.map((c: string) => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn-outline btn-sm" onClick={() => setShowNuevoCorreder(true)} title="Crear corredor" style={{ padding: '8px 12px', fontSize: 16, flexShrink: 0 }}>+</button>
                  </div>
                )}
              </div>
              <div className="fgroup">
                <label>Vencimiento</label>
                <div style={{ outline: errores.vencimiento ? '1.5px solid var(--danger)' : 'none', borderRadius: 8 }}>
                <DatePicker value={polizaForm.vencimiento} onChange={v => { setPolizaForm({ ...polizaForm, vencimiento: v }); setErrores(p => ({...p, vencimiento: false})) }} placeholder="Seleccionar fecha" />
                </div>
                {errores.vencimiento && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Moneda</label>
                <select value={polizaForm.moneda} onChange={e => setPolizaForm({ ...polizaForm, moneda: e.target.value })}
                  style={{ color: polizaForm.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar moneda —</option>
                  {(catalogos.monedas || []).map((m: string) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label>Cantidad de cuotas</label>
                <input type="number" min="1" max="36" value={polizaForm.cuotas}
                  onChange={e => { setPolizaForm({ ...polizaForm, cuotas: e.target.value, fechasCuotas: [] }); setErrores(p => ({...p, cuotas: false})) }}
                  placeholder="Ej: 10"
                  style={{ borderColor: errores.cuotas ? 'var(--danger)' : undefined }} />
                {errores.cuotas && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Ingresá al menos 1 cuota</div>}
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>
                  Fechas de vencimiento por cuota *
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--slate)', marginLeft: 6 }}>
                    — ingresá la cantidad de cuotas primero
                  </span>
                </label>
                {Object.keys(errores).some(k => k.startsWith('fecha_cuota')) && (
                  <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>Completá todas las fechas de cuotas</div>
                )}
                <CuotasFechas
                  cuotas={parseInt(polizaForm.cuotas) || 0}
                  value={polizaForm.fechasCuotas}
                  onChange={v => setPolizaForm({ ...polizaForm, fechasCuotas: v })}
                />
              </div>
            </div>
            {/* Nota */}
            <div className="fgroup" style={{ marginTop: 4 }}>
              <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--slate)' }}>(opcional)</span></label>
              <textarea
                value={polizaForm.nota}
                onChange={e => setPolizaForm({ ...polizaForm, nota: e.target.value })}
                placeholder="Descripción del bien asegurado"
                rows={2}
                style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)', lineHeight: 1.5, transition: 'border-color .14s' }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPolizaModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarPoliza} disabled={savingPoliza}>
                {savingPoliza ? <><Loader2 size={14} /> Guardando...</> : 'Guardar póliza'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      {showPagoModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPagoModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar pago</h3>
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {nombre} · {showPagoModal.ramo} · Cuota {showPagoModal.cuotaNum}
            </div>
            <div className="fgroup"><label>Fecha de pago</label><DatePicker value={pagoForm.fecha} onChange={v => setPagoForm({ ...pagoForm, fecha: v })} /></div>
            <div className="fgroup">
              <label>Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {catalogos.metodos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup"><label>Referencia / Comprobante</label><input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Nro. de comprobante (opcional)" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarPago} disabled={savingPago}>
                {savingPago ? <><Loader2 size={14} /> Guardando...</> : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selector de tipo de documento */}
      {showTipoDocModal && uploadPolizaSel && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowTipoDocModal(false) }}>
          <div className="pago-modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Subir documento</h3>
              <button onClick={() => setShowTipoDocModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {uploadPolizaSel.ramo} · {uploadPolizaSel.numero}
            </div>
            <div className="fgroup">
              <label>Tipo de documento</label>
              <select value={tipoDocSel} onChange={e => setTipoDocSel(e.target.value)}>
                {tiposDoc.map((t: string) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowTipoDocModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={() => { setShowTipoDocModal(false); fileInputRef.current?.click() }}>
                <Upload size={14} /> Seleccionar archivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input oculto para subir documentos */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && uploadPolizaSel) subirDocumento(file, uploadPolizaSel)
          e.target.value = '' // reset so same file can be selected again
        }}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 300,
          background: toast.startsWith('') ? '#D94F4F' : 'var(--navy)',
          color: 'white', padding: '12px 20px', borderRadius: 10,
          fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)',
          borderLeft: `3px solid ${toast.startsWith('') ? '#FF8080' : 'var(--gold)'}`,
          animation: 'fadeIn .2s ease'
        }}>
          {toast}
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}

FILEEOF
echo '+ app/(app)/clientes/ClienteDetalle.tsx'

git add .
git commit -m 'feat: campos dinamicos por ramo en formulario y vista detalle'
git push
