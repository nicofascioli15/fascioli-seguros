#!/bin/bash
set -e
mkdir -p 'app/(app)/clientes'
cat > 'app/(app)/clientes/ClienteDetalle.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import DatePicker from '@/components/DatePicker'
import { ChevronRight, Paperclip, Phone, Mail, MessageCircle, Plus, X, Upload, Download, Trash2, Pencil } from 'lucide-react'

const FERIADOS_UY = ['01-01', '05-01', '07-18', '08-25', '12-25']
function esFeriado(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return FERIADOS_UY.includes(`${mm}-${dd}`)
}
function siguienteDiaHabil(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  while (date.getDay() === 0 || date.getDay() === 6 || esFeriado(date)) {
    date.setDate(date.getDate() + 1)
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthRaw = m - 1 + months
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const finalDay = Math.min(d, maxDay)
  const raw = `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(finalDay).padStart(2,'0')}`
  return siguienteDiaHabil(raw)
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

function fechasACuotaMes(fechas: string[]): string {
  return fechas.map((f, i) => {
    if (!f) return `${i+1}/?`
    const [y,m,d] = f.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
  }).join(' - ')
}

function ramoDot(ramo: string) {
  const map: Record<string,string> = {
    'Incendio': '#D94F4F', 'Vehículos': '#7C5CBF', 'Vida': '#2E9668',
    'RC': '#2456B0', 'Multirriesgo': '#D97706', 'Inmuebles': '#0891B2',
  }
  return map[ramo] || '#94A3B8'
}

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function estadoBadge(venc: string | null) {
  const d = diasHasta(venc)
  if (d === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (d < 0) return { label: 'Vencida', cls: 'badge-danger' }
  if (d <= 30) return { label: `${d}d`, cls: 'badge-danger' }
  if (d <= 90) return { label: `${d}d`, cls: 'badge-warning' }
  return { label: formatFecha(venc), cls: 'badge-success' }
}

function CampoInput({ campo, value, onChange }: {
  campo: { id: string; nombre: string; tipo: string; opciones: string | null }
  value: string
  onChange: (v: string) => void
}) {
  if (campo.tipo === 'numero_moneda') {
    const parts = value.split('|')
    const monto = parts[0] || ''
    const moneda = parts[1] || 'U$S'
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={moneda} onChange={e => onChange(`${monto}|${e.target.value}`)} style={{ flex: 1, minWidth: 70 }}>
          <option>U$S</option><option>$</option><option>€</option>
        </select>
        <input type="number" value={monto} onChange={e => onChange(`${e.target.value}|${moneda}`)} placeholder="0" style={{ flex: 3 }} />
      </div>
    )
  }
  if (campo.tipo === 'select' && campo.opciones) return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ color: value ? 'var(--navy)' : 'var(--slate)' }}>
      <option value="">— Seleccionar —</option>
      {campo.opciones.split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
    </select>
  )
  if (campo.tipo === 'boolean') return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ color: value ? 'var(--navy)' : 'var(--slate)' }}>
      <option value="">— Seleccionar —</option>
      <option>Sí</option><option>No</option>
    </select>
  )
  if (campo.tipo === 'fecha') return <DatePicker value={value} onChange={onChange} />
  return <input type={campo.tipo === 'numero' ? 'number' : 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={campo.nombre} />
}

function CuotasFechas({ cuotas, value, onChange }: { cuotas: number; value: string[]; onChange: (v: string[]) => void }) {
  if (cuotas === 0) return (
    <div style={{ padding: '12px', background: '#F4F7FB', borderRadius: 8, fontSize: 13, color: 'var(--slate)', textAlign: 'center' }}>
      Ingresá la cantidad de cuotas primero
    </div>
  )
  const dates = Array.from({ length: cuotas }, (_, i) => value[i] || '')
  function handleChange(idx: number, val: string) {
    const next = [...dates]; next[idx] = val
    if (idx === 0 && val) {
      for (let i = 1; i < cuotas; i++) { if (!next[i]) next[i] = addMonthsAndDays(val, i) }
    }
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
      {dates.map((fecha, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: fecha ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: fecha ? 'var(--gold)' : 'var(--slate)' }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <DatePicker value={fecha} onChange={val => handleChange(i, val)} placeholder={i === 0 ? 'Fecha 1ª cuota (auto-completa las siguientes)' : `Fecha cuota ${i + 1}`} />
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

type Poliza = {
  id: string; numero: string; ramo: string; compania: string; vencimiento: string | null
  corredor: string; moneda: string; cuotas: number; cuota_mes: string; nota: string
  poliza_campos?: { valor: string; campos_ramo: { nombre: string } }[]
  pagos?: Record<number, { fecha: string; metodo: string; referencia: string }>
  docs?: Doc[]
}

type Doc = { id: string; nombre: string; tipo: string; storage_path: string; tamanio_bytes: number }

interface Props { id: string; nombre: string; onBack: () => void }

export default function ClienteDetalle({ id, nombre, onBack }: Props) {
  const supabase = createClient()

  const [polizas, setPolizas]     = useState<Poliza[]>([])
  const [loading, setLoading]     = useState(true)
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})
  const [catalogos, setCatalogos] = useState<{ ramos: string[]; companias: string[]; corredores: string[]; monedas: string[]; metodos: string[] }>({ ramos: [], companias: [], corredores: [], monedas: [], metodos: [] })
  const [toast, setToast]         = useState<string | null>(null)

  // Nueva póliza
  const [showPolizaModal, setShowPolizaModal] = useState(false)
  const [polizaForm, setPolizaForm]           = useState({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: '' })
  const [camposRamo, setCamposRamo]           = useState<{ id: string; nombre: string; tipo: string; opciones: string | null }[]>([])
  const [valoresCampos, setValoresCampos]     = useState<Record<string, string>>({})
  const [errores, setErrores]                 = useState<Record<string, boolean>>({})
  const [savingPoliza, setSavingPoliza]       = useState(false)
  const [showNuevoCorreder, setShowNuevoCorreder] = useState(false)
  const [nuevoCorreder, setNuevoCorreder]     = useState('')

  // Editar póliza
  const [editandoPoliza, setEditandoPoliza]     = useState<Poliza | null>(null)
  const [editPolizaForm, setEditPolizaForm]     = useState<any>({})
  const [editCamposRamo, setEditCamposRamo]     = useState<{ id: string; nombre: string; tipo: string; opciones: string | null }[]>([])
  const [editValoresCampos, setEditValoresCampos] = useState<Record<string, string>>({})
  const [savingEditPoliza, setSavingEditPoliza] = useState(false)

  // Pago
  const [showPagoModal, setShowPagoModal]   = useState<{ polizaId: string; cuotaNum: number; ramo: string } | null>(null)
  const [pagoForm, setPagoForm]             = useState({ fecha: new Date().toISOString().slice(0, 10), metodo: 'Transferencia', referencia: '' })
  const [savingPago, setSavingPago]         = useState(false)

  // Docs
  const [uploadingDoc, setUploadingDoc]     = useState<string | null>(null)
  const [tiposDoc, setTiposDoc]             = useState<string[]>([])
  const [uploadPolizaId, setUploadPolizaId] = useState<string | null>(null)
  const [uploadTipoDoc, setUploadTipoDoc]   = useState('')
  const fileRef                             = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchPolizas(); fetchCatalogos() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function fetchPolizas() {
    setLoading(true)
    const { data } = await supabase.from('polizas')
      .select('*, poliza_campos(valor, campos_ramo(nombre))')
      .eq('cliente_id', id).order('created_at')
    if (data) {
      // Load pagos and docs for each poliza
      const ids = data.map((p: any) => p.id)
      const [{ data: pagosData }, { data: docsData }] = await Promise.all([
        supabase.from('pagos').select('*').in('poliza_id', ids),
        supabase.from('documentos').select('*').in('poliza_id', ids).order('created_at', { ascending: false }),
      ])
      const pagosMap: Record<string, any> = {}
      ;(pagosData || []).forEach((pg: any) => {
        if (!pagosMap[pg.poliza_id]) pagosMap[pg.poliza_id] = {}
        pagosMap[pg.poliza_id][pg.cuota_num] = pg
      })
      const docsMap: Record<string, Doc[]> = {}
      ;(docsData || []).forEach((doc: any) => {
        if (!docsMap[doc.poliza_id]) docsMap[doc.poliza_id] = []
        docsMap[doc.poliza_id].push(doc)
      })
      setPolizas(data.map((p: any) => ({ ...p, pagos: pagosMap[p.id] || {}, docs: docsMap[p.id] || [] })))
    }
    setLoading(false)
  }

  async function fetchCatalogos() {
    const [r, c, co, m, mp, td] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
      supabase.from('metodos_pago').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x: any) => x.nombre),
      companias: (c.data || []).map((x: any) => x.nombre),
      corredores:(co.data || []).map((x: any) => x.nombre),
      monedas:   (m.data || []).map((x: any) => x.nombre),
      metodos:   (mp.data || []).map((x: any) => x.nombre),
    })
    setTiposDoc((td.data || []).map((x: any) => x.nombre))
    setUploadTipoDoc((td.data || [])[0]?.nombre || '')
    setPagoForm(p => ({ ...p, metodo: (mp.data || [])[0]?.nombre || 'Transferencia' }))
  }

  async function loadCamposRamo(ramo: string, polizaId?: string) {
    const { data: ramoData } = await supabase.from('ramos').select('id').eq('nombre', ramo).single()
    if (!ramoData) { setCamposRamo([]); setValoresCampos({}); return }
    const { data: campos } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden')
    setCamposRamo(campos || [])
    if (polizaId) {
      const { data: vals } = await supabase.from('poliza_campos').select('campo_id, valor').eq('poliza_id', polizaId)
      const map: Record<string, string> = {}
      ;(vals || []).forEach((v: any) => { map[v.campo_id] = v.valor })
      setEditValoresCampos(map)
    } else {
      setValoresCampos({})
    }
  }

  async function abrirEditar(pol: Poliza) {
    setEditandoPoliza(pol)
    setEditPolizaForm({ numero: pol.numero, ramo: pol.ramo, compania: pol.compania, corredor: pol.corredor, moneda: pol.moneda, vencimiento: pol.vencimiento, nota: pol.nota || '' })
    const { data: ramoData } = await supabase.from('ramos').select('id').eq('nombre', pol.ramo).single()
    if (!ramoData) { setEditCamposRamo([]); setEditValoresCampos({}); return }
    const [{ data: campos }, { data: vals }] = await Promise.all([
      supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden'),
      supabase.from('poliza_campos').select('campo_id, valor').eq('poliza_id', pol.id),
    ])
    setEditCamposRamo(campos || [])
    const map: Record<string, string> = {}
    ;(vals || []).forEach((v: any) => { map[v.campo_id] = v.valor })
    setEditValoresCampos(map)
  }

  async function guardarEditPoliza() {
    if (!editandoPoliza) return
    setSavingEditPoliza(true)
    await supabase.from('polizas').update({
      numero: editPolizaForm.numero, ramo: editPolizaForm.ramo,
      compania: editPolizaForm.compania, corredor: editPolizaForm.corredor,
      moneda: editPolizaForm.moneda, vencimiento: editPolizaForm.vencimiento || null,
      nota: editPolizaForm.nota || null,
    }).eq('id', editandoPoliza.id)
    if (editCamposRamo.length > 0) {
      const upserts = Object.entries(editValoresCampos).filter(([_, v]) => v.trim())
        .map(([campoId, valor]) => ({ poliza_id: editandoPoliza.id, campo_id: campoId, valor }))
      if (upserts.length > 0) await supabase.from('poliza_campos').upsert(upserts, { onConflict: 'poliza_id,campo_id' })
    }
    setEditandoPoliza(null)
    setSavingEditPoliza(false)
    showToast('Póliza actualizada')
    await fetchPolizas()
  }

  async function guardarPoliza() {
    const nCuotas = parseInt(polizaForm.cuotas) || 0
    const errs: Record<string, boolean> = {}
    if (!polizaForm.numero.trim())  errs.numero = true
    if (!polizaForm.ramo)           errs.ramo = true
    if (!polizaForm.compania)       errs.compania = true
    if (!polizaForm.corredor)       errs.corredor = true
    if (!polizaForm.vencimiento)    errs.vencimiento = true
    if (nCuotas < 1)                errs.cuotas = true
    if (nCuotas > 0 && !polizaForm.fechasCuotas[0]) errs.fecha_cuota_0 = true
    if (nCuotas > 0) {
      polizaForm.fechasCuotas.slice(0, nCuotas).forEach((f, i) => { if (!f) errs[`fecha_cuota_${i}`] = true })
    }
    if (Object.keys(errs).length > 0) { setErrores(errs); showToast('Completá todos los campos obligatorios'); return }
    setErrores({})
    setSavingPoliza(true)
    const { error, data: polData } = await supabase.from('polizas').insert([{
      cliente_id: id, ramo: polizaForm.ramo, compania: polizaForm.compania,
      numero: polizaForm.numero, vencimiento: polizaForm.vencimiento || null,
      corredor: polizaForm.corredor, moneda: polizaForm.moneda, cuotas: nCuotas,
      cuota_mes: fechasACuotaMes(polizaForm.fechasCuotas), nota: polizaForm.nota || null,
    }]).select().single()
    if (!error && polData) {
      const polizaId = (polData as any).id
      if (Object.keys(valoresCampos).length > 0) {
        const inserts = Object.entries(valoresCampos).filter(([_, v]) => v.trim())
          .map(([campoId, valor]) => ({ poliza_id: polizaId, campo_id: campoId, valor }))
        if (inserts.length > 0) await supabase.from('poliza_campos').insert(inserts)
      }
      await registrarAudit({ accion: 'crear', tabla: 'polizas', registroId: polizaId, descripcion: `Póliza creada: ${polizaForm.ramo} ${polizaForm.numero} — ${nombre}`, datosDespues: polData })
      setShowPolizaModal(false)
      setCamposRamo([]); setValoresCampos({})
      setPolizaForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '' })
      await fetchPolizas()
    }
    setSavingPoliza(false)
  }

  async function eliminarPoliza(polizaId: string) {
    if (!confirm('¿Eliminar esta póliza?')) return
    const { data: polAntes } = await supabase.from('polizas').select('*').eq('id', polizaId).single()
    await supabase.from('polizas').delete().eq('id', polizaId)
    await registrarAudit({ accion: 'eliminar', tabla: 'polizas', registroId: polizaId, descripcion: `Póliza eliminada: ${polAntes?.ramo} ${polAntes?.numero} — ${nombre}`, datosAntes: polAntes })
    await fetchPolizas()
  }

  async function registrarPago() {
    if (!showPagoModal) return
    setSavingPago(true)
    const { data: pagoData } = await supabase.from('pagos').upsert([{
      poliza_id: showPagoModal.polizaId, cuota_num: showPagoModal.cuotaNum,
      fecha: pagoForm.fecha, metodo: pagoForm.metodo, referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' }).select().single()
    await registrarAudit({ accion: 'crear', tabla: 'pagos', registroId: (pagoData as any)?.id, descripcion: `Pago registrado: cuota ${showPagoModal.cuotaNum} — ${showPagoModal.ramo} — ${nombre}`, datosDespues: pagoData })
    setShowPagoModal(null)
    setSavingPago(false)
    await fetchPolizas()
  }

  async function deshacerPago(polizaId: string, cuotaNum: number) {
    if (!confirm('¿Deshacer este pago?')) return
    await supabase.from('pagos').delete().eq('poliza_id', polizaId).eq('cuota_num', cuotaNum)
    await fetchPolizas()
  }

  async function crearCorredor() {
    if (!nuevoCorreder.trim()) return
    await supabase.from('corredores').insert([{ nombre: nuevoCorreder.trim() }])
    const { data } = await supabase.from('corredores').select('nombre').order('nombre')
    setCatalogos(p => ({ ...p, corredores: (data || []).map((x: any) => x.nombre) }))
    setPolizaForm(p => ({ ...p, corredor: nuevoCorreder.trim() }))
    setShowNuevoCorreder(false); setNuevoCorreder('')
  }

  async function subirDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadPolizaId) return
    setUploadingDoc(uploadPolizaId)
    const path = `${id}/${uploadPolizaId}/${Date.now()}_${file.name}`
    await supabase.storage.from('documentos').upload(path, file)
    await supabase.from('documentos').insert([{ cliente_id: id, poliza_id: uploadPolizaId, nombre: file.name, tipo: uploadTipoDoc, storage_path: path, tamanio_bytes: file.size }])
    setUploadingDoc(null); setUploadPolizaId(null)
    await fetchPolizas(); showToast('Documento subido')
  }

  async function descargarDoc(doc: Doc) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminarDoc(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    await fetchPolizas(); showToast('Documento eliminado')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>{nombre}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowPolizaModal(true)}><Plus size={15} /> Nueva póliza</button>
      </div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0 }}>
        ← Volver a clientes
      </button>

      {/* Polizas */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{nombre}</div>
          <div style={{ background: '#EEF2F8', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{polizas.length}</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)' }}>PÓLIZAS</div>
          </div>
        </div>

        {loading ? <div style={{ color: 'var(--slate)', fontSize: 13 }}>Cargando...</div>
        : polizas.length === 0 ? <div style={{ color: 'var(--slate)', fontSize: 13 }}>Sin pólizas — creá la primera arriba</div>
        : polizas.map(pol => {
          const isOpen = !!openCards[pol.id]
          const { label, cls } = estadoBadge(pol.vencimiento)
          const pagosMap: Record<number, any> = {}
          ;(pol.pagos ? Object.entries(pol.pagos) : []).forEach(([k, v]) => { pagosMap[Number(k)] = v })

          return (
            <div key={pol.id} className="poliza-card" style={{ transition: 'box-shadow .25s ease', boxShadow: isOpen ? '0 4px 20px rgba(15,30,53,.1)' : 'none' }}>
              <div className="poliza-card-header"
                onClick={() => setOpenCards(prev => ({ ...prev, [pol.id]: !prev[pol.id] }))}
                style={{ transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <div className="ramo-dot" style={{ background: ramoDot(pol.ramo) }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="poliza-ramo">{pol.ramo}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="poliza-id">{pol.numero}</div>
                    {pol.nota && (
                      <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                        {pol.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                    )}
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{pol.compania}</span>
                <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>{label}</span>
                <button className="btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); abrirEditar(pol) }}>
                  <Pencil size={11} /> Editar
                </button>
                <ChevronRight size={16} style={{ marginLeft: 4, color: 'var(--slate)', transition: 'transform .28s ease', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
              </div>

              <div className="poliza-card-body" style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows .28s ease' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div className="poliza-grid">
                    <div className="poliza-field"><div className="field-label">N° Póliza</div><div className="field-val" style={{ fontFamily: 'monospace' }}>{pol.numero}</div></div>
                    <div className="poliza-field"><div className="field-label">Vencimiento</div><div className="field-val">{formatFecha(pol.vencimiento)}</div></div>
                    <div className="poliza-field"><div className="field-label">Moneda</div><div className="field-val">{pol.moneda}</div></div>
                    <div className="poliza-field"><div className="field-label">Corredor</div><div className="field-val">{pol.corredor}</div></div>
                    <div className="poliza-field"><div className="field-label">Cuotas</div><div className="field-val">{pol.cuotas || '—'}</div></div>
                  </div>

                  {pol.nota && (
                    <div style={{ background: '#F4F7FB', borderRadius: 8, padding: '10px 14px', marginBottom: 12, borderLeft: '3px solid var(--gold)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 4 }}>Nota</div>
                      <div style={{ fontSize: 13.5, color: 'var(--navy)' }}>{pol.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</div>
                    </div>
                  )}

                  {pol.poliza_campos && pol.poliza_campos.filter(pc => pc.valor && pc.campos_ramo?.nombre).length > 0 && (
                    <div style={{ background: '#F4F7FB', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 8 }}>
                        Datos específicos — {pol.ramo}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        {pol.poliza_campos.filter(pc => pc.valor && pc.campos_ramo?.nombre).map((pc, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 2 }}>{pc.campos_ramo.nombre}</div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{formatValor(pc.valor)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fechas por cuota */}
                  {pol.cuota_mes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 8 }}>Fechas de vencimiento</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
                        {pol.cuota_mes.split(' - ').map((item, i) => {
                          const pagado = pol.pagos && (pol.pagos as any)[i+1]
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: pagado ? '#E6F5EF' : '#F4F7FB', borderRadius: 7, padding: '4px 10px', fontSize: 12.5, fontWeight: 500, color: 'var(--navy)' }}>
                              <span style={{ fontWeight: 800, color: 'var(--slate)', fontSize: 11, minWidth: 14 }}>{i+1}</span>
                              <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
                              <span>{item.split('/').slice(1).join('/')}</span>
                              {pagado && <span style={{ fontSize: 10, color: '#1A7A4E', fontWeight: 700 }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cuotas / Pagos */}
                  {pol.cuotas > 0 && pol.cuota_mes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 8 }}>
                        Cuotas
                      </div>
                      {pol.cuota_mes.split(' - ').map((item, i) => {
                        const n = i + 1
                        const pago = pol.pagos && (pol.pagos as any)[n]
                        const fechaStr = item.split('/').slice(1).join('/')
                        return (
                          <div key={n} className={`cuota-row ${pago ? 'paid' : ''}`}>
                            <div className={`cuota-num ${pago ? 'paid' : 'pending'}`}>{n}</div>
                            <div className="cuota-info">
                              <div className="cuota-title">Cuota {n} — {fechaStr}</div>
                              <div className="cuota-sub">{pago ? `Pagado ${pago.fecha} · ${pago.metodo}` : 'Pendiente'}</div>
                            </div>
                            {pago ? (
                              <><span className="cuota-paid-tag">Pagada</span>
                              <button className="btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => deshacerPago(pol.id, n)}>Deshacer</button></>
                            ) : (
                              <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: catalogos.metodos[0] || 'Transferencia', referencia: '' }); setShowPagoModal({ polizaId: pol.id, cuotaNum: n, ramo: pol.ramo }) }}>
                                + Registrar pago
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Documentos */}
                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {/* Lista de docs existentes */}
                    {pol.docs && pol.docs.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        {pol.docs.map((doc: Doc) => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5FB' }}>
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--slate)', flexShrink: 0 }}>{doc.tipo}</div>
                            <button className="btn-outline btn-sm" onClick={() => descargarDoc(doc)} title="Descargar"><Download size={12} /></button>
                            <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminarDoc(doc)} title="Eliminar"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select value={uploadTipoDoc} onChange={e => setUploadTipoDoc(e.target.value)}
                          style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
                          {tiposDoc.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <button className="btn-outline btn-sm" onClick={() => { setUploadPolizaId(pol.id); fileRef.current?.click() }} disabled={uploadingDoc === pol.id}>
                          <Upload size={13} /> {uploadingDoc === pol.id ? 'Subiendo...' : 'Subir doc'}
                        </button>
                      </div>
                      <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminarPoliza(pol.id)}>
                        <Trash2 size={13} /> Eliminar póliza
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={subirDoc} />

      {/* Modal nueva póliza */}
      {showPolizaModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowPolizaModal(false); setErrores({}); setCamposRamo([]); setValoresCampos({}) } }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nueva póliza</h3>
              <button onClick={() => { setShowPolizaModal(false); setErrores({}) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 16 }}>Cliente: {nombre}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup">
                <label>Ramo *</label>
                <select value={polizaForm.ramo} onChange={async e => {
                  const r = e.target.value; setPolizaForm({ ...polizaForm, ramo: r }); setErrores(p => ({...p, ramo: false})); setValoresCampos({})
                  if (r) { const { data: rd } = await supabase.from('ramos').select('id').eq('nombre', r).single(); if (rd) { const { data: c } = await supabase.from('campos_ramo').select('*').eq('ramo_id', rd.id).order('orden'); setCamposRamo(c || []) } else setCamposRamo([]) } else setCamposRamo([])
                }} style={{ borderColor: errores.ramo ? 'var(--danger)' : undefined, color: polizaForm.ramo ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar —</option>
                  {catalogos.ramos.map(r => <option key={r}>{r}</option>)}
                </select>
                {errores.ramo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>N° Póliza *</label>
                <input value={polizaForm.numero} onChange={e => { setPolizaForm({ ...polizaForm, numero: e.target.value }); setErrores(p => ({...p, numero: false})) }} placeholder="Ej: 4309338" autoFocus style={{ borderColor: errores.numero ? 'var(--danger)' : undefined }} />
                {errores.numero && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Compañía *</label>
                <select value={polizaForm.compania} onChange={e => { setPolizaForm({ ...polizaForm, compania: e.target.value }); setErrores(p => ({...p, compania: false})) }} style={{ borderColor: errores.compania ? 'var(--danger)' : undefined, color: polizaForm.compania ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar —</option>
                  {catalogos.companias.map(c => <option key={c}>{c}</option>)}
                </select>
                {errores.compania && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Corredor *</label>
                {showNuevoCorreder ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={nuevoCorreder} onChange={e => setNuevoCorreder(e.target.value)} onKeyDown={e => e.key === 'Enter' && crearCorredor()} placeholder="Nombre del corredor" autoFocus style={{ flex: 1, padding: '10px 13px', border: '1.5px solid var(--gold)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    <button className="btn-primary btn-sm" onClick={crearCorredor} style={{ padding: '8px 12px' }}>✓</button>
                    <button className="btn-outline btn-sm" onClick={() => { setShowNuevoCorreder(false); setNuevoCorreder('') }} style={{ padding: '8px 12px' }}>×</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={polizaForm.corredor} onChange={e => { setPolizaForm({ ...polizaForm, corredor: e.target.value }); setErrores(p => ({...p, corredor: false})) }} style={{ flex: 1, color: polizaForm.corredor ? 'var(--navy)' : 'var(--slate)', borderColor: errores.corredor ? 'var(--danger)' : undefined }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.corredores.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn-outline btn-sm" onClick={() => setShowNuevoCorreder(true)} title="Crear corredor" style={{ padding: '8px 12px', fontSize: 16, flexShrink: 0 }}>+</button>
                  </div>
                )}
                {errores.corredor && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Vencimiento *</label>
                <div style={{ border: errores.vencimiento ? '1.5px solid var(--danger)' : '1.5px solid transparent', borderRadius: 9 }}>
                  <DatePicker value={polizaForm.vencimiento} onChange={v => { setPolizaForm({ ...polizaForm, vencimiento: v }); setErrores(p => ({...p, vencimiento: false})) }} placeholder="Seleccionar fecha" />
                </div>
                {errores.vencimiento && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Campo obligatorio</div>}
              </div>
              <div className="fgroup">
                <label>Moneda *</label>
                <select value={polizaForm.moneda} onChange={e => setPolizaForm({ ...polizaForm, moneda: e.target.value })} style={{ color: polizaForm.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                  <option value="">— Seleccionar —</option>
                  {catalogos.monedas.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label>Cantidad de cuotas *</label>
                <input type="number" min="1" max="36" value={polizaForm.cuotas} onChange={e => { setPolizaForm({ ...polizaForm, cuotas: e.target.value, fechasCuotas: [] }); setErrores(p => ({...p, cuotas: false})) }} placeholder="Ej: 10" style={{ borderColor: errores.cuotas ? 'var(--danger)' : undefined }} />
                {errores.cuotas && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Ingresá al menos 1 cuota</div>}
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Fechas de vencimiento por cuota *<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--slate)', marginLeft: 6 }}>— ingresá la cantidad primero</span></label>
                {Object.keys(errores).some(k => k.startsWith('fecha_cuota')) && <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>Completá todas las fechas</div>}
                <CuotasFechas cuotas={parseInt(polizaForm.cuotas) || 0} value={polizaForm.fechasCuotas} onChange={v => setPolizaForm({ ...polizaForm, fechasCuotas: v })} />
              </div>

              {camposRamo.length > 0 && (
                <div style={{ gridColumn: 'span 2', background: '#F4F7FB', borderRadius: 10, padding: 14, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 12 }}>Datos específicos de {polizaForm.ramo}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                    {camposRamo.map(campo => (
                      <div key={campo.id} className="fgroup">
                        <label>{campo.nombre}</label>
                        <CampoInput campo={campo} value={valoresCampos[campo.id] || ''} onChange={v => setValoresCampos(p => ({...p, [campo.id]: v}))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--slate)' }}>(opcional)</span></label>
                <textarea value={polizaForm.nota} onChange={e => setPolizaForm({ ...polizaForm, nota: e.target.value })} placeholder="Descripción del bien asegurado" rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => { setShowPolizaModal(false); setErrores({}) }}>Cancelar</button>
              <button className="btn-primary" onClick={guardarPoliza} disabled={savingPoliza}>
                {savingPoliza ? 'Guardando...' : 'Guardar póliza'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar póliza */}
      {editandoPoliza && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditandoPoliza(null) }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar póliza</h3>
              <button onClick={() => setEditandoPoliza(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup"><label>N° Póliza</label><input value={editPolizaForm.numero || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, numero: e.target.value}))} /></div>
              <div className="fgroup"><label>Ramo</label>
                <select value={editPolizaForm.ramo || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, ramo: e.target.value}))}>
                  {catalogos.ramos.map(r => <option key={r}>{r}</option>)}
                </select></div>
              <div className="fgroup"><label>Compañía</label>
                <select value={editPolizaForm.compania || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, compania: e.target.value}))}>
                  {catalogos.companias.map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Corredor</label>
                <select value={editPolizaForm.corredor || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, corredor: e.target.value}))}>
                  {catalogos.corredores.map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div className="fgroup"><label>Vencimiento</label>
                <DatePicker value={editPolizaForm.vencimiento || ''} onChange={v => setEditPolizaForm((p: any) => ({...p, vencimiento: v}))} /></div>
              <div className="fgroup"><label>Moneda</label>
                <select value={editPolizaForm.moneda || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, moneda: e.target.value}))}>
                  {catalogos.monedas.map(m => <option key={m}>{m}</option>)}
                </select></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nota (opcional)</label>
                <textarea value={editPolizaForm.nota || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, nota: e.target.value}))} rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)' }} /></div>
            </div>
            {editCamposRamo.length > 0 && (
              <div style={{ background: '#F4F7FB', borderRadius: 10, padding: 14, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 12 }}>Datos específicos — {editPolizaForm.ramo}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  {editCamposRamo.map(campo => (
                    <div key={campo.id} className="fgroup">
                      <label>{campo.nombre}</label>
                      <CampoInput campo={campo} value={editValoresCampos[campo.id] || ''} onChange={v => setEditValoresCampos(p => ({...p, [campo.id]: v}))} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditandoPoliza(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEditPoliza} disabled={savingEditPoliza}>
                {savingEditPoliza ? 'Guardando...' : 'Guardar cambios'}
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
              {showPagoModal.ramo} · Cuota {showPagoModal.cuotaNum}
            </div>
            <div className="fgroup"><label>Fecha de pago</label><DatePicker value={pagoForm.fecha} onChange={v => setPagoForm({ ...pagoForm, fecha: v })} /></div>
            <div className="fgroup"><label>Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {catalogos.metodos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup"><label>Referencia</label><input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Comprobante (opcional)" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarPago} disabled={savingPago}>
                {savingPago ? 'Guardando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>
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
git add .
git commit -m 'fix: docs con eliminar, tipo antes de subir, editar en header'
git push
