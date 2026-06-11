#!/bin/bash
set -e
echo 'Aplicando audit log + roles + historial...'

mkdir -p app/usuarios app/historial

cat > app/clientes/ClienteDetalle.tsx << 'FILEEOF'
'use client'
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
                <select value={polizaForm.ramo} onChange={e => { setPolizaForm({ ...polizaForm, ramo: e.target.value }); setErrores(p => ({...p, ramo: false})) }}
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
echo '+ app/clientes/ClienteDetalle.tsx'

cat > app/clientes/ClientesList.tsx << 'FILEEOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Loader2, Upload, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'

type Cliente = {
  id: string
  nombre: string
  direccion: string
  contacto: string
  tel: string
  email: string
}

type Props = { onSelect: (id: string, nombre: string) => void }

export default function ClientesList({ onSelect }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
  const supabase                = createClient()
  const csvRef                  = useRef<HTMLInputElement>(null)
  const [showImport, setShowImport] = useState(false)
  const [csvPreview, setCsvPreview] = useState<{rows: Omit<Cliente,'id'>[]; errors: string[]}>({ rows: [], errors: [] })
  const [importing, setImporting]   = useState(false)
  const [importDone, setImportDone] = useState<{ok:number;skip:number} | null>(null)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre')
    if (!error && data) setClientes(data)
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const { error, data } = await supabase.from('clientes').insert([form]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'clientes', registroId: data.id, descripcion: `Cliente creado: ${form.nombre}`, datosDespues: data })
      setForm({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
      setShowModal(false)
      await fetchClientes()
    }
    setSaving(false)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán también sus pólizas.`)) return
    const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
    await supabase.from('clientes').delete().eq('id', id)
    await registrarAudit({ accion: 'eliminar', tabla: 'clientes', registroId: id, descripcion: `Cliente eliminado: ${nombre}`, datosAntes: data })
    await fetchClientes()
  }

  function descargarPlantilla() {
    const csv = [
      'nombre,direccion,contacto,tel,email',
      'Le Mans,Av. Italia 1234,Juan Pérez,099123456,juan@lemans.com.uy',
      'Sea Park,Bvar. España 567,María García,098765432,',
      'Rocamar,,,,'
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'plantilla_clientes_fascioli.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseCsv(text: string) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return { rows: [], errors: ['El archivo está vacío o no tiene datos'] }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, ''))
    const errors: string[] = []
    const rows: Omit<Cliente,'id'>[] = []

    // Detect column positions flexibly
    const idx = {
      nombre:    header.findIndex(h => h.includes('nombre') || h.includes('name')),
      direccion: header.findIndex(h => h.includes('direcci') || h.includes('address') || h.includes('domicilio')),
      contacto:  header.findIndex(h => h.includes('contacto') || h.includes('contact') || h.includes('administrador')),
      tel:       header.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('celular')),
      email:     header.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('correo')),
    }

    if (idx.nombre === -1) {
      return { rows: [], errors: ['No se encontró columna "nombre" en el CSV'] }
    }

    lines.slice(1).forEach((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const nombre = idx.nombre >= 0 ? cols[idx.nombre] : ''
      if (!nombre) { errors.push(`Fila ${i+2}: nombre vacío, se omite`); return }
      rows.push({
        nombre,
        direccion: idx.direccion >= 0 ? (cols[idx.direccion] || '') : '',
        contacto:  idx.contacto  >= 0 ? (cols[idx.contacto]  || '') : '',
        tel:       idx.tel       >= 0 ? (cols[idx.tel]        || '') : '',
        email:     idx.email     >= 0 ? (cols[idx.email]      || '') : '',
      })
    })

    return { rows, errors }
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCsv(text)
      setCsvPreview(result)
      setShowImport(true)
      setImportDone(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function confirmarImport() {
    if (csvPreview.rows.length === 0) return
    setImporting(true)
    let ok = 0, skip = 0

    // Insert in batches of 50
    const batch = csvPreview.rows
    const { data, error } = await supabase.from('clientes').insert(batch).select()
    if (error) {
      // Try one by one to skip duplicates
      for (const row of batch) {
        const { error: e } = await supabase.from('clientes').insert([row])
        if (e) skip++
        else ok++
      }
    } else {
      ok = data?.length || batch.length
    }

    setImporting(false)
    setImportDone({ ok, skip })
    await fetchClientes()
  }

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>{clientes.length} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => { setShowImport(true); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>
            <Upload size={15} /> Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); e.target.value = '' }} />
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 340, background: 'white', color: 'var(--navy)' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--slate)' }}>
          <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
          <div>Cargando clientes...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtrados.map(c => (
            <div key={c.id} className="edif-card" onClick={() => onSelect(c.id, c.nombre)}>
              <div className="edif-avatar">{c.nombre.trim()[0]?.toUpperCase() || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="edif-name">{c.nombre}</div>
                <div className="edif-addr">{c.direccion || 'Sin dirección registrada'}</div>
                {c.contacto && <div style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 2 }}>{c.contacto}</div>}
              </div>
              <button className="edif-del-btn" onClick={e => { e.stopPropagation(); eliminar(c.id, c.nombre) }} title="Eliminar">
                <X size={15} />
              </button>
            </div>
          ))}
          {!loading && filtrados.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
              {search ? 'No se encontraron clientes' : (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}></div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay clientes aún</div>
                  <div style={{ fontSize: 12 }}>Agregá el primer cliente con el botón de arriba</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo cliente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Nombre del cliente *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del edificio o cliente" autoFocus />
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Dirección</label>
                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Av. Italia 7191, Montevideo" />
              </div>
              <div className="fgroup">
                <label>Contacto</label>
                <input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del administrador" />
              </div>
              <div className="fgroup">
                <label>Teléfono</label>
                <input value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} placeholder="09X XXX XXX" />
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@cliente.com" />
              </div>
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

      {/* Modal importar CSV */}
      {showImport && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) } }}>
          <div className="pago-modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Importar clientes desde CSV</h3>
              <button onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {importDone ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E6F5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle size={24} color="var(--success)" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>Importación completada</div>
                <div style={{ fontSize: 14, color: 'var(--slate)' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>{importDone.ok} clientes importados</span>
                  {importDone.skip > 0 && <span> · {importDone.skip} omitidos</span>}
                </div>
                <button className="btn-primary" style={{ marginTop: 20 }}
                  onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                {/* Guía de columnas */}
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ background: '#F4F7FB', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Columnas requeridas (en este orden)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                      {[
                        { col: 'nombre',    req: true,  desc: 'Obligatorio' },
                        { col: 'direccion', req: false, desc: 'Opcional' },
                        { col: 'contacto',  req: false, desc: 'Opcional' },
                        { col: 'tel',       req: false, desc: 'Opcional' },
                        { col: 'email',     req: false, desc: 'Opcional' },
                      ].map(c => (
                        <div key={c.col} style={{ textAlign: 'center', background: 'white', borderRadius: 7, padding: '7px 6px', border: `1.5px solid ${c.req ? 'var(--gold)' : 'var(--border)'}` }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: c.req ? 'var(--navy)' : 'var(--slate)' }}>{c.col}</div>
                          <div style={{ fontSize: 10, color: c.req ? 'var(--gold)' : 'var(--slate)', marginTop: 2 }}>{c.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn-outline" onClick={descargarPlantilla} style={{ fontSize: 13, width: '100%', justifyContent: 'center' }}>
                    <Download size={14} /> Descargar plantilla CSV lista para completar
                  </button>
                </div>

                {/* Errores */}
                {csvPreview.errors.length > 0 && (
                  <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    {csvPreview.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: '#92400E', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {e}
                      </div>
                    ))}
                  </div>
                )}

                {csvPreview.rows.length === 0 && csvPreview.errors.length === 0 ? (
                  // Estado inicial — zona de drop/click
                  <div
                    onClick={() => csvRef.current?.click()}
                    style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', background: '#FAFBFC', transition: 'all .2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = '#FAFBFC' }}
                  >
                    <Upload size={26} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--slate)' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 4 }}>Seleccionar archivo CSV</div>
                    <div style={{ fontSize: 12.5, color: 'var(--slate)' }}>Hacé click acá o arrastrá tu archivo</div>
                  </div>
                ) : csvPreview.rows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--slate)', fontSize: 13 }}>
                    No se encontraron filas válidas en el archivo
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>
                      Vista previa — {csvPreview.rows.length} clientes a importar
                    </div>
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC' }}>
                            {['Nombre','Dirección','Contacto','Tel','Email'].map(h => (
                              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.rows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #F1F5FB' }}>
                              <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{r.nombre}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.direccion || '—'}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.contacto || '—'}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.tel || '—'}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.email || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <button className="btn-outline" onClick={() => csvRef.current?.click()}>
                        <Upload size={14} /> Cambiar archivo
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-outline" onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) }}>Cancelar</button>
                        <button className="btn-primary" onClick={confirmarImport} disabled={importing}>
                          {importing
                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
                            : <>Importar {csvPreview.rows.length} clientes</>}
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

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/clientes/ClientesList.tsx'

cat > app/clientes/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

FILEEOF
echo '+ app/clientes/layout.tsx'

cat > app/clientes/page.tsx << 'FILEEOF'
'use client'
import { useState } from 'react'
import ClientesList from './ClientesList'
import ClienteDetalle from './ClienteDetalle'

export default function ClientesPage() {
  const [selected, setSelected] = useState<{ id: string; nombre: string } | null>(null)

  if (selected) {
    return <ClienteDetalle id={selected.id} nombre={selected.nombre} onBack={() => setSelected(null)} />
  }

  return <ClientesList onSelect={(id, nombre) => setSelected({ id, nombre })} />
}

FILEEOF
echo '+ app/clientes/page.tsx'

cat > app/configuracion/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>
}

FILEEOF
echo '+ app/configuracion/layout.tsx'

cat > app/configuracion/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; nombre: string }
type Tabla = 'companias' | 'ramos' | 'corredores' | 'metodos_pago' | 'tipos_siniestro' | 'tipos_documento' | 'monedas'

const SECCIONES: { tabla: Tabla; titulo: string; abrev: string; placeholder: string }[] = [
  { tabla: 'companias',       titulo: 'Compañías aseguradoras',   abrev: 'CIA', placeholder: 'Ej: BSE, SURA, Mapfre...' },
  { tabla: 'ramos',           titulo: 'Ramos / Tipos de seguro',  abrev: 'RAM', placeholder: 'Ej: Incendio, RC...' },
  { tabla: 'corredores',      titulo: 'Corredores',               abrev: 'COR', placeholder: 'Ej: Fascioli...' },
  { tabla: 'metodos_pago',    titulo: 'Métodos de pago',          abrev: 'PAG', placeholder: 'Ej: Transferencia...' },
  { tabla: 'tipos_siniestro', titulo: 'Tipos de siniestro',       abrev: 'SIN', placeholder: 'Ej: Choque, Robo...' },
  { tabla: 'tipos_documento', titulo: 'Tipos de documento',       abrev: 'DOC', placeholder: 'Ej: Póliza, Endoso...' },
  { tabla: 'monedas',         titulo: 'Monedas',                  abrev: 'MON', placeholder: 'Ej: U$S, $, €...' },
]

function Seccion({ tabla, titulo, abrev, placeholder }: typeof SECCIONES[0]) {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from(tabla).select('id, nombre').order('nombre')
    if (data) setItems(data)
    setLoading(false)
  }

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setSaving(true)
    const { error } = await supabase.from(tabla).insert([{ nombre }])
    if (error) {
      showToast(`${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    } else {
      setNuevo('')
      showToast(`"${nombre}" agregado`)
      await fetch()
    }
    setSaving(false)
  }

  async function eliminar(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) {
      showToast(`No se pudo eliminar — puede estar en uso`)
    } else {
      showToast(`"${item.nombre}" eliminado`)
      await fetch()
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.04em' }}>{abrev}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>
            {loading ? '...' : `${items.length} registros`}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--navy)', transition: 'border-color .14s' }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nuevo.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>

      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--slate)' }}>
            <Loader2 size={18} style={{ display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }} />
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>
            Sin registros — agregá el primero arriba
          </div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--navy)' }}>{item.nombre}</span>
            <button
              onClick={() => eliminar(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ padding: '10px 16px', background: toast.startsWith('') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('') ? '#991B1B' : '#1A7A4E' }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Administrá todos los catálogos del sistema</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {SECCIONES.map(s => <Seccion key={s.tabla} {...s} />)}
      </div>
    </div>
  )
}

FILEEOF
echo '+ app/configuracion/page.tsx'

cat > app/dashboard/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>
}

FILEEOF
echo '+ app/dashboard/layout.tsx'

cat > app/dashboard/page.tsx << 'FILEEOF'
'use client'
import { useEffect, useState } from 'react'
import { FileText, CreditCard, Bell, AlertTriangle, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ polizas: 0, venc30: 0, cuotasPend: 0, siniestros: 0, clientes: 0 })
  const [loading, setLoading] = useState(true)
  const [vencProximas, setVencProximas] = useState<any[]>([])

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const [{ count: polizas }, { data: polizasData }, { count: siniestros }, { count: clientes }] = await Promise.all([
      supabase.from('polizas').select('*', { count: 'exact', head: true }),
      supabase.from('polizas').select('id, numero, ramo, vencimiento, clientes(nombre)'),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).neq('estado', 'Cerrado'),
      supabase.from('clientes').select('*', { count: 'exact', head: true }),
    ])

    const venc30 = (polizasData || []).filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 30 }).length
    const proximas = (polizasData || [])
      .filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d >= 0 && d <= 90 })
      .sort((a, b) => (diasHasta(a.vencimiento) || 0) - (diasHasta(b.vencimiento) || 0))
      .slice(0, 6)

    setStats({ polizas: polizas || 0, venc30, cuotasPend: 0, siniestros: siniestros || 0, clientes: clientes || 0 })
    setVencProximas(proximas)
    setLoading(false)
  }

  function formatFecha(iso: string | null) {
    if (!iso) return '—'
    const [y,m,d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const statCards = [
    { label: 'Pólizas activas',     value: loading ? '—' : stats.polizas,    sub: 'En cartera',          icon: FileText,      bg: '#EEF2F8', iconColor: '#2456B0' },
    { label: 'Vencen en 30 días',   value: loading ? '—' : stats.venc30,     sub: 'Requieren atención',  icon: Bell,          bg: '#FEF3C7', iconColor: '#D97706' },
    { label: 'Siniestros abiertos', value: loading ? '—' : stats.siniestros, sub: 'En gestión',          icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F' },
    { label: 'Clientes',            value: loading ? '—' : stats.clientes,   sub: 'Registrados',         icon: Users,         bg: '#E6F5EF', iconColor: '#2A7A56' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
          {new Date().toLocaleDateString('es-UY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="label">{s.label}</div>
                <div className="value">{s.value}</div>
                <div className="sub">{s.sub}</div>
              </div>
              <div style={{ background: s.bg, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <s.icon size={20} color={s.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Próximos vencimientos */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Próximos vencimientos</div>
          {loading ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>Cargando...</div>
          ) : vencProximas.length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>No hay vencimientos próximos</div>
          ) : vencProximas.map(p => {
            const d = diasHasta(p.vencimiento)
            const cls = d !== null && d <= 7 ? 'badge-danger' : d !== null && d <= 30 ? 'badge-warning' : 'badge-success'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F5FB' }}>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{p.ramo}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p.clientes as any)?.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--slate)', fontFamily: 'monospace' }}>{p.numero}</span>
                <span className={`badge ${cls}`}>{d}d</span>
              </div>
            )
          })}
          {vencProximas.length > 0 && (
            <a href="/vencimientos" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
          )}
        </div>

        {/* Accesos rápidos */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Accesos rápidos</div>
          {[
            { href: '/clientes',     Icon: Users,         label: 'Nuevo cliente',    sub: 'Agregar un cliente a la cartera' },
            { href: '/polizas',      Icon: FileText,      label: 'Nueva póliza',     sub: 'Cargar una póliza existente' },
            { href: '/vencimientos', Icon: Bell,          label: 'Ver vencimientos', sub: 'Pólizas próximas a vencer' },
            { href: '/siniestros',   Icon: AlertTriangle, label: 'Nuevo siniestro',  sub: 'Registrar un siniestro' },
          ].map(({ href, Icon, label, sub }) => (
            <a key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', transition: 'background .12s', marginBottom: 4 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} color="var(--navy)" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>{sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

FILEEOF
echo '+ app/dashboard/page.tsx'

cat > app/documentos/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>
}

FILEEOF
echo '+ app/documentos/layout.tsx'

cat > app/documentos/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, Search, Loader2, X, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'


const extStyle: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: '#FEE2E2', color: '#991B1B', label: 'PDF' },
  jpg:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  jpeg: { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  png:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  docx: { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  doc:  { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  xlsx: { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
  xls:  { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
}

function getExt(nombre: string) { return nombre.split('.').pop()?.toLowerCase() || 'pdf' }
function formatBytes(b: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}
function formatFecha(iso: string) {
  const [y,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${y}`
}

type Documento = {
  id: string; nombre: string; tipo: string; storage_path: string
  tamanio_bytes: number; created_at: string
  clientes: { nombre: string } | null
  polizas: { numero: string; ramo: string } | null
}
type Cliente = { id: string; nombre: string; direccion: string }
type Poliza  = { id: string; numero: string; ramo: string; compania: string }
type Paso    = 'cliente' | 'poliza' | 'archivo'

export default function DocumentosPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [tiposDoc, setTiposDoc]     = useState<string[]>([])
  const [docs, setDocs]             = useState<Documento[]>([])
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [polizasCliente, setPolizasCliente] = useState<Poliza[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [drag, setDrag]             = useState(false)
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  // Modal upload (3 pasos)
  const [showModal, setShowModal]   = useState(false)
  const [paso, setPaso]             = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [polizaSel, setPolizaSel]   = useState<Poliza | null>(null)
  const [fileSel, setFileSel]       = useState<File | null>(null)
  const [tipoDoc, setTipoDoc]       = useState('Póliza')

  useEffect(() => {
    fetchDocs()
    fetchClientes()
    supabase.from('tipos_documento').select('nombre').order('nombre')
      .then(({ data }) => { if (data) setTiposDoc(data.map((x: any) => x.nombre)) })
  }, [])

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('documentos')
      .select('*, clientes(nombre), polizas(numero, ramo)')
      .order('created_at', { ascending: false })
    if (data) setDocs(data)
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchPolizasCliente(clienteId: string) {
    const { data } = await supabase
      .from('polizas').select('id, numero, ramo, compania')
      .eq('cliente_id', clienteId).order('ramo')
    setPolizasCliente(data || [])
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSel(null)
    setPolizaSel(null); setFileSel(null); setTipoDoc('Póliza')
    setPolizasCliente([])
    setShowModal(true)
  }

  function cerrarModal() { setShowModal(false) }

  // Cuando el usuario elige un archivo en el paso 3
  function onFileChange(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileSel(files[0])
  }

  async function confirmarSubida() {
    if (!clienteSel || !polizaSel || !fileSel) return
    setUploading(true)
    cerrarModal()

    const path = `${clienteSel.id}/${polizaSel.id}/${Date.now()}_${fileSel.name.replace(/\s/g, '_')}`

    const { error: storageErr } = await supabase.storage
      .from('documentos')
      .upload(path, fileSel, { upsert: false })

    if (storageErr) {
      alert(`Error al subir: ${storageErr.message}`)
      setUploading(false)
      return
    }

    await supabase.from('documentos').insert([{
      nombre:        fileSel.name,
      tipo:          tipoDoc,
      storage_path:  path,
      tamanio_bytes: fileSel.size,
      cliente_id:    clienteSel.id,
      poliza_id:     polizaSel.id,
    }])

    setUploading(false)
    setFileSel(null)
    await fetchDocs()
  }

  // Drag & drop en la zona principal también abre el modal
  function handleDrop(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileSel(files[0])
    abrirModal()
  }

  async function descargar(doc: Documento) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    await fetchDocs()
  }

  const filtrados = docs.filter(d => {
    const q = search.toLowerCase()
    return (!q || d.nombre.toLowerCase().includes(q) || (d.clientes?.nombre || '').toLowerCase().includes(q)) &&
           (filtroTipo === 'Todos' || d.tipo === filtroTipo)
  })

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Documentos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Archivo centralizado de pólizas, endosos y expedientes</p>
        </div>
        <button className="btn-primary" onClick={abrirModal} disabled={uploading}>
          {uploading
            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</>
            : <><Upload size={14} /> Subir archivo</>}
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleDrop(e.dataTransfer.files) }}
        onClick={abrirModal}
        style={{
          border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12,
          padding: '28px 24px', textAlign: 'center', marginBottom: 24,
          background: drag ? 'var(--gold-pale)' : '#FAFBFC', transition: 'all .2s', cursor: 'pointer'
        }}
      >
        {uploading
          ? <><Loader2 size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)', display: 'block', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 600, color: 'var(--gold)', fontSize: 14 }}>Subiendo archivo...</div></>
          : <><Upload size={24} style={{ margin: '0 auto 8px', color: drag ? 'var(--gold)' : 'var(--slate)', display: 'block' }} />
              <div style={{ fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: 14 }}>
                {drag ? 'Soltá el archivo' : 'Arrastrá un archivo acá'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel · Se asignará a un cliente y póliza</div></>
        }
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar archivo o cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos', ...tiposDoc].map((t: string) => <button key={t} onClick={() => setFiltroTipo(t)} className={`filter-btn ${filtroTipo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 52 }} /><col /><col style={{ width: 130 }} />
            <col style={{ width: 160 }} /><col style={{ width: 150 }} /><col style={{ width: 90 }} /><col style={{ width: 110 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr><th></th><th>Archivo</th><th>Tipo</th><th>Cliente</th><th>Póliza</th><th>Tamaño</th><th>Subido</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando documentos...
              </td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay documentos subidos</div>
                <div style={{ fontSize: 12 }}>Arrastrá archivos arriba o usá el botón "Subir archivo"</div>
              </td></tr>
            ) : filtrados.map(d => {
              const ext = extStyle[getExt(d.nombre)] || extStyle.pdf
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ width: 36, height: 36, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{d.nombre}</td>
                  <td><span className="badge badge-neutral">{d.tipo}</span></td>
                  <td style={{ fontSize: 13 }}>{d.clientes?.nombre || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--slate)' }}>
                    {d.polizas ? <><span className="badge badge-neutral" style={{ marginRight: 4 }}>{d.polizas.ramo}</span>{d.polizas.numero}</> : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatBytes(d.tamanio_bytes)}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatFecha(d.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-outline btn-sm" onClick={() => descargar(d)} title="Descargar"><Download size={13} /></button>
                      <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminar(d)} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Mobile card list */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtrados.map(d => {
            const ext = extStyle[getExt(d.nombre)] || extStyle.pdf
            return (
              <div key={d.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 2 }}>{d.clientes?.nombre || '—'} · {d.tipo} · {formatBytes(d.tamanio_bytes)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-outline btn-sm" onClick={() => descargar(d)}><Download size={13} /></button>
                  <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminar(d)}><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL SUBIR (3 pasos: cliente → póliza → archivo) */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : paso === 'poliza' ? 'Seleccionar póliza' : 'Subir archivo'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? 1 : paso === 'poliza' ? 2 : 3} de 3
                  {clienteSel && paso !== 'cliente' && ` — ${clienteSel.nombre}`}
                  {polizaSel && paso === 'archivo' && ` · ${polizaSel.ramo} ${polizaSel.numero}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {/* Barra de progreso */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza','archivo'].map((p, i) => {
                const idx = ['cliente','poliza','archivo'].indexOf(paso)
                return <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .2s', background: i <= idx ? 'var(--gold)' : 'var(--border)' }} />
              })}
            </div>

            {/* Paso 1: cliente */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--navy)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id}
                      onClick={() => { setClienteSel(c); fetchPolizasCliente(c.id); setPaso('poliza') }}
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
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No se encontraron clientes</div>}
                </div>
              </>
            )}

            {/* Paso 2: póliza */}
            {paso === 'poliza' && (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {polizasCliente.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>Este cliente no tiene pólizas cargadas</div>
                  ) : polizasCliente.map(p => (
                    <div key={p.id}
                      onClick={() => { setPolizaSel(p); setPaso('archivo') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-neutral">{p.ramo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{p.numero}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{p.compania}</div>
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
                <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-start' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                </div>
              </>
            )}

            {/* Paso 3: archivo */}
            {paso === 'archivo' && (
              <>
                {/* Drop zone dentro del modal */}
                <div
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: `2px dashed ${fileSel ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '24px', textAlign: 'center', cursor: 'pointer',
                    background: fileSel ? '#F0FDF8' : '#FAFBFC', marginBottom: 16, transition: 'all .2s'
                  }}
                >
                  {fileSel ? (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 6 }}></div>
                      <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>{fileSel.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{formatBytes(fileSel.size)} · Click para cambiar</div>
                    </>
                  ) : (
                    <>
                      <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--slate)', display: 'block' }} />
                      <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14 }}>Hacé click para seleccionar</div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel</div>
                    </>
                  )}
                </div>
                <input ref={inputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={e => onFileChange(e.target.files)} />

                <div className="fgroup">
                  <label>Tipo de documento</label>
                  <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                    {tiposDoc.map((t: string) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('poliza')}>← Cambiar póliza</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={confirmarSubida} disabled={!fileSel}>
                      <Upload size={14} /> Subir archivo
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/documentos/page.tsx'

cat > app/historial/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Loader2, RotateCcw, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRol } from '@/lib/useRol'
import { useRouter } from 'next/navigation'

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

const tablaLabel: Record<string, string> = {
  clientes:   'Cliente',
  polizas:    'Póliza',
  pagos:      'Pago',
  siniestros: 'Siniestro',
  documentos: 'Documento',
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
}

export default function HistorialPage() {
  const supabase = createClient()
  const { esSuperAdmin, loading: loadingRol } = useRol()
  const router   = useRouter()
  const [logs, setLogs]         = useState<LogEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtroTabla, setFiltroTabla] = useState('Todos')
  const [filtroAccion, setFiltroAccion] = useState('Todos')
  const [reverting, setReverting] = useState<string | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    if (!loadingRol && !esSuperAdmin) router.push('/dashboard')
  }, [loadingRol, esSuperAdmin])

  useEffect(() => { fetchLogs() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500) }

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setLogs(data)
    setLoading(false)
  }

  async function revertir(log: LogEntry) {
    if (!log.datos_antes && log.accion !== 'crear') {
      showToast('No hay datos anteriores para revertir')
      return
    }
    if (!confirm(`¿Revertir esta acción?\n${log.descripcion}`)) return

    setReverting(log.id)
    const supabase = createClient()

    try {
      if (log.accion === 'crear' && log.registro_id) {
        // Revertir creación = eliminar el registro
        await supabase.from(log.tabla).delete().eq('id', log.registro_id)
        showToast('Registro eliminado — creación revertida')

      } else if (log.accion === 'eliminar' && log.datos_antes) {
        // Revertir eliminación = recrear el registro
        await supabase.from(log.tabla).insert([log.datos_antes])
        showToast('Registro restaurado correctamente')

      } else if (log.accion === 'editar' && log.datos_antes && log.registro_id) {
        // Revertir edición = restaurar valores anteriores
        const { id, created_at, ...datosARestore } = log.datos_antes
        await supabase.from(log.tabla).update(datosARestore).eq('id', log.registro_id)
        showToast('Cambios revertidos correctamente')
      }

      // Marcar como revertido
      await supabase.from('audit_log').update({ revertido: true }).eq('id', log.id)
      await fetchLogs()

    } catch (e) {
      showToast('Error al revertir')
    }
    setReverting(null)
  }

  const filtrados = logs.filter(l => {
    const q = search.toLowerCase()
    return (!q || l.descripcion?.toLowerCase().includes(q) || l.usuario_email?.toLowerCase().includes(q)) &&
           (filtroTabla === 'Todos' || l.tabla === filtroTabla) &&
           (filtroAccion === 'Todos' || l.accion === filtroAccion)
  })

  if (loadingRol) return null

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Historial de cambios</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
          Registro de todas las acciones — solo visible para Super Admin
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar acción o usuario..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 260, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos','clientes','polizas','pagos','siniestros','documentos'].map(t =>
            <button key={t} onClick={() => setFiltroTabla(t)} className={`filter-btn ${filtroTabla === t ? 'active' : ''}`}>
              {t === 'Todos' ? 'Todos' : tablaLabel[t] || t}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Todos','crear','editar','eliminar'].map(a =>
            <button key={a} onClick={() => setFiltroAccion(a)} className={`filter-btn ${filtroAccion === a ? 'active' : ''}`}>
              {a === 'Todos' ? 'Todas' : a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando historial...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin registros</div>
          <div style={{ fontSize: 12 }}>Las acciones del sistema aparecerán aquí automáticamente</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(log => (
            <div key={log.id} style={{
              background: log.revertido ? '#F8FAFC' : 'white',
              borderRadius: 12, border: '1px solid var(--border)',
              overflow: 'hidden',
              opacity: log.revertido ? 0.6 : 1
            }}>
              <div
                style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setExpandido(expandido === log.id ? null : log.id)}
              >
                {/* Acción badge */}
                <span className={`badge ${accionColor[log.accion] || 'badge-neutral'}`} style={{ flexShrink: 0 }}>
                  {log.accion.charAt(0).toUpperCase() + log.accion.slice(1)}
                </span>

                {/* Tabla badge */}
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>
                  {tablaLabel[log.tabla] || log.tabla}
                </span>

                {/* Descripción */}
                <div style={{ flex: 1, fontSize: 13.5, color: 'var(--navy)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.descripcion}
                </div>

                {/* Revertido tag */}
                {log.revertido && (
                  <span style={{ fontSize: 11, color: 'var(--slate)', fontStyle: 'italic', flexShrink: 0 }}>Revertido</span>
                )}

                {/* Usuario + fecha */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{log.usuario_email?.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 1 }}>{formatFecha(log.created_at)}</div>
                </div>

                {/* Revertir btn */}
                {!log.revertido && log.accion !== 'editar' || (!log.revertido && log.datos_antes) ? (
                  <button
                    className="btn-outline btn-sm"
                    style={{ fontSize: 11, flexShrink: 0, color: 'var(--danger)', borderColor: '#FEE2E2' }}
                    onClick={e => { e.stopPropagation(); revertir(log) }}
                    disabled={reverting === log.id}
                  >
                    {reverting === log.id
                      ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      : <><RotateCcw size={12} /> Revertir</>
                    }
                  </button>
                ) : null}
              </div>

              {/* Detalle expandido */}
              {expandido === log.id && (log.datos_antes || log.datos_despues) && (
                <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    {log.datos_antes && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--danger)', marginBottom: 6 }}>Antes</div>
                        <pre style={{ fontSize: 11, background: '#FEF2F2', borderRadius: 8, padding: '10px 12px', overflow: 'auto', maxHeight: 180, color: 'var(--navy)', margin: 0 }}>
                          {JSON.stringify(log.datos_antes, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.datos_despues && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--success)', marginBottom: 6 }}>Después</div>
                        <pre style={{ fontSize: 11, background: '#F0FDF4', borderRadius: 8, padding: '10px 12px', overflow: 'auto', maxHeight: 180, color: 'var(--navy)', margin: 0 }}>
                          {JSON.stringify(log.datos_despues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>{toast}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/historial/page.tsx'

cat > app/layout.tsx << 'FILEEOF'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fascioli Seguros — Intranet',
  description: 'Sistema interno de gestión de seguros',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

FILEEOF
echo '+ app/layout.tsx'

cat > app/login/page.tsx << 'FILEEOF'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgb(27,67,95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo + título */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            background: 'rgba(255,255,255,.08)',
            borderRadius: 18,
            padding: '24px 36px',
            display: 'inline-block',
            marginBottom: 20,
            border: '1px solid rgba(255,255,255,.12)'
          }}>
            <img src="/logo-fascioli.svg" alt="Fascioli" style={{ height: 64, display: 'block' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '.02em' }}>
            Control Seguros
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>
            Sistema interno de gestión
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,.35)'
        }}>

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', marginBottom: 8 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
              <input
                type="email"
                placeholder="usuario@fascioli.com.uy"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px 12px 42px',
                  border: '1.5px solid var(--border)', borderRadius: 10,
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  color: 'var(--navy)', background: 'white',
                  transition: 'border-color .15s', boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', marginBottom: 8 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', padding: '12px 44px 12px 42px',
                  border: '1.5px solid var(--border)', borderRadius: 10,
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  color: 'var(--navy)', background: 'white',
                  transition: 'border-color .15s', boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--slate)', padding: 4, display: 'flex', alignItems: 'center'
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEE2E2', color: '#991B1B',
              padding: '10px 14px', borderRadius: 9,
              fontSize: 13, marginBottom: 18,
              borderLeft: '3px solid #D94F4F'
            }}>
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '13px',
              background: loading || !email || !password ? '#D4A83A' : 'var(--gold)',
              color: 'var(--navy)', fontWeight: 800, fontSize: 15,
              border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .15s', fontFamily: 'inherit',
              opacity: loading || !email || !password ? 0.7 : 1
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
          Fascioli Administraciones © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

FILEEOF
echo '+ app/login/page.tsx'

cat > app/page.tsx << 'FILEEOF'
import { redirect } from 'next/navigation'
export default function Home() { redirect('/dashboard') }

FILEEOF
echo '+ app/page.tsx'

cat > app/pagos/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>
}

FILEEOF
echo '+ app/pagos/layout.tsx'

cat > app/pagos/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Search, Download, CheckCircle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'

const estadoColor: Record<string, string> = {
  'Cobrado':   'badge-success',
  'Pendiente': 'badge-warning',
  'Vencido':   'badge-danger',
}

// Metodos loaded from Supabase

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

type Cuota = {
  poliza_id: string
  cuota_num: number
  numero_poliza: string
  ramo: string
  compania: string
  cliente_nombre: string
  vencimiento: string | null
  moneda: string
  pago_id: string | null
  pago_fecha: string | null
  pago_metodo: string | null
  pago_ref: string | null
}

export default function PagosPage() {
  const supabase = createClient()
  const [metodos, setMetodos] = useState<string[]>([])
  const [cuotas, setCuotas]     = useState<Cuota[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtro, setFiltro]     = useState('Todos')
  const [showModal, setShowModal] = useState<Cuota | null>(null)
  const [pagoForm, setPagoForm] = useState({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    fetchCuotas()
    supabase.from('metodos_pago').select('nombre').order('nombre')
      .then(({ data }) => { if (data) setMetodos(data.map((x:any) => x.nombre)) })
  }, [])

  async function fetchCuotas() {
    setLoading(true)
    // Traer todas las polizas con sus clientes
    const { data: polizas } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento, moneda, cuotas, cliente_id, clientes(nombre)')
      .order('created_at', { ascending: false })

    if (!polizas) { setLoading(false); return }

    // Traer todos los pagos
    const polizaIds = polizas.map(p => p.id)
    const { data: pagos } = await supabase
      .from('pagos')
      .select('*')
      .in('poliza_id', polizaIds)

    // Expandir cuotas
    const rows: Cuota[] = []
    for (const pol of polizas) {
      const nCuotas = pol.cuotas || 0
      if (nCuotas === 0) continue
      for (let n = 1; n <= nCuotas; n++) {
        const pago = pagos?.find(pg => pg.poliza_id === pol.id && pg.cuota_num === n)
        const d = diasHasta(pol.vencimiento)
        rows.push({
          poliza_id:       pol.id,
          cuota_num:       n,
          numero_poliza:   pol.numero,
          ramo:            pol.ramo,
          compania:        pol.compania,
          cliente_nombre:  (pol.clientes as any)?.nombre || '—',
          vencimiento:     pol.vencimiento,
          moneda:          pol.moneda,
          pago_id:         pago?.id || null,
          pago_fecha:      pago?.fecha || null,
          pago_metodo:     pago?.metodo || null,
          pago_ref:        pago?.referencia || null,
        })
      }
    }
    setCuotas(rows)
    setLoading(false)
  }

  async function cobrar() {
    if (!showModal) return
    setSaving(true)
    await supabase.from('pagos').upsert([{
      poliza_id:  showModal.poliza_id,
      cuota_num:  showModal.cuota_num,
      fecha:      pagoForm.fecha,
      metodo:     pagoForm.metodo,
      referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' })
    setShowModal(null)
    setSaving(false)
    await fetchCuotas()
  }

  async function deshacer(c: Cuota) {
    await supabase.from('pagos').delete().eq('poliza_id', c.poliza_id).eq('cuota_num', c.cuota_num)
    await fetchCuotas()
  }

  const getEstado = (c: Cuota) => {
    if (c.pago_id) return 'Cobrado'
    const d = diasHasta(c.vencimiento)
    if (d !== null && d < 0) return 'Vencido'
    return 'Pendiente'
  }

  const filtradas = cuotas.filter(c => {
    const q = search.toLowerCase()
    const estado = getEstado(c)
    return (!q || c.cliente_nombre.toLowerCase().includes(q) || c.numero_poliza.toLowerCase().includes(q) || c.ramo.toLowerCase().includes(q)) &&
           (filtro === 'Todos' || estado === filtro)
  })

  const totalCobrado   = cuotas.filter(c => c.pago_id).length
  const totalPendiente = cuotas.filter(c => !c.pago_id && (diasHasta(c.vencimiento) ?? 1) >= 0).length
  const totalVencido   = cuotas.filter(c => !c.pago_id && (diasHasta(c.vencimiento) ?? 1) < 0).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Pagos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Seguimiento de cuotas por póliza</p>
        </div>
        <button className="btn-outline"><Download size={14} /> Exportar</button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Cuotas cobradas',   value: totalCobrado,   bg: '#E6F5EF', color: '#1A7A4E' },
          { label: 'Cuotas pendientes', value: totalPendiente, bg: '#FEF3C7', color: '#92400E' },
          { label: 'Cuotas vencidas',   value: totalVencido,   bg: '#FEE2E2', color: '#991B1B' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: s.color, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente, póliza o ramo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Todos','Cobrado','Pendiente','Vencido'].map(t =>
            <button key={t} onClick={() => setFiltro(t)} className={`filter-btn ${filtro === t ? 'active' : ''}`}>{t}</button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 180 }} /><col style={{ width: 130 }} /><col style={{ width: 110 }} />
            <col style={{ width: 110 }} /><col style={{ width: 70 }} /><col style={{ width: 120 }} />
            <col style={{ width: 120 }} /><col style={{ width: 100 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Cliente</th><th>N° Póliza</th><th>Ramo</th><th>Compañía</th>
              <th>Cuota</th><th>Vencimiento</th><th>Cobrado</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando pagos...
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay cuotas registradas</div>
                <div style={{ fontSize: 12 }}>Las cuotas aparecen automáticamente cuando cargás pólizas con cuotas en Clientes</div>
              </td></tr>
            ) : filtradas.map((c, i) => {
              const estado = getEstado(c)
              return (
                <tr key={`${c.poliza_id}-${c.cuota_num}`}>
                  <td style={{ fontWeight: 600 }}>{c.cliente_nombre}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.numero_poliza}</td>
                  <td><span className="badge badge-neutral">{c.ramo}</span></td>
                  <td style={{ color: 'var(--slate)', fontSize: 13 }}>{c.compania}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.cuota_num}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatFecha(c.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{c.pago_fecha ? formatFecha(c.pago_fecha) + (c.pago_metodo ? ` · ${c.pago_metodo}` : '') : '—'}</td>
                  <td><span className={`badge ${estadoColor[estado]}`}>{estado}</span></td>
                  <td>
                    {estado !== 'Cobrado'
                      ? <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' }); setShowModal(c) }}>
                          <CheckCircle size={12} /> Cobrar
                        </button>
                      : <button className="btn-outline btn-sm" style={{ fontSize: 11, color: 'var(--slate)' }} onClick={() => deshacer(c)}>Deshacer</button>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Mobile card list */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtradas.map((c, i) => {
            const estado = getEstado(c)
            return (
              <div key={`${c.poliza_id}-${c.cuota_num}`} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.cliente_nombre}</div>
                  <span className={`badge ${estadoColor[estado]}`}>{estado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{c.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{c.numero_poliza}</span>
                  {' · '}Cuota {c.cuota_num}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                    {c.pago_fecha ? `Cobrado ${formatFecha(c.pago_fecha)} · ${c.pago_metodo}` : `Vence ${formatFecha(c.vencimiento)}`}
                  </div>
                  {estado !== 'Cobrado' && (
                    <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' }); setShowModal(c) }}>
                      Cobrar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal cobrar */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar cobro</h3>
              <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {showModal.cliente_nombre} · {showModal.ramo} · Cuota {showModal.cuota_num}
            </div>
            <div className="fgroup"><label>Fecha de cobro</label><DatePicker value={pagoForm.fecha} onChange={v => setPagoForm({ ...pagoForm, fecha: v })} /></div>
            <div className="fgroup">
              <label>Método</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {metodos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup"><label>Referencia</label><input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="Comprobante (opcional)" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={cobrar} disabled={saving}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Confirmar cobro'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/pagos/page.tsx'

cat > app/polizas/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>
}

FILEEOF
echo '+ app/polizas/layout.tsx'

cat > app/polizas/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, X, ChevronRight, Loader2 } from 'lucide-react'
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
// Convierte array de fechas a string legible
function fechasACuotaMes(fechas: string[]): string {
  return fechas.map((f, i) => {
    if (!f) return `${i+1}/?`
    const [y,m,d] = f.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
  }).join(' - ')
}

function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const newDay = d + months
  const targetMonthRaw = m - 1 + months
  const targetYear  = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(Math.min(newDay, maxDay)).padStart(2,'0')}`
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

// ── Tipos ────────────────────────────────────────────────────────────────────
type Cliente = { id: string; nombre: string; direccion: string }
type Poliza  = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null; corredor: string; moneda: string; cuotas: number; cuota_mes: string; cliente_id: string; clientes?: { nombre: string } }

// Pasos del modal
type Paso = 'cliente' | 'poliza'

export default function PolizasPage() {
  const supabase = createClient()

  const [catalogos, setCatalogos] = useState<{ramos:string[];companias:string[];corredores:string[];monedas:string[]}>({ramos:[],companias:[],corredores:[],monedas:[]})
  const [polizas, setPolizas]         = useState<Poliza[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtroRamo, setFiltroRamo]   = useState('Todos')

  // Modal nueva póliza
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({
    ramo: '', compania: '', numero: '', vencimiento: '',
    corredor: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: ''
  })

  useEffect(() => {
    fetchPolizas()
    fetchClientes()
    fetchCatalogos()
  }, [])

  async function fetchPolizas() {
    setLoading(true)
    const { data } = await supabase
      .from('polizas')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
    if (data) setPolizas(data)
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

  async function guardarPoliza() {
    if (!clienteSeleccionado || !form.numero.trim()) return
    const nCuotas = parseInt(form.cuotas) || 0
    if (nCuotas < 1) { alert('Ingresá al menos 1 cuota'); return }
    if (!form.fechasCuotas[0]) { alert('Ingresá la fecha de la primera cuota'); return }
    const faltantes = form.fechasCuotas.slice(0, nCuotas).filter(f => !f).length
    if (faltantes > 0) { alert(`Faltan ${faltantes} fechas de cuotas`); return }
    setSaving(true)
    const { error } = await supabase.from('polizas').insert([{
      cliente_id:  clienteSeleccionado.id,
      ramo:        form.ramo,
      compania:    form.compania,
      numero:      form.numero,
      vencimiento: form.vencimiento || null,
      corredor:    form.corredor,
      moneda:      form.moneda,
      cuotas:      parseInt(form.cuotas) || 0,
      cuota_mes:   fechasACuotaMes(form.fechasCuotas),
      nota:        form.nota || null,
    }])
    if (!error) {
      cerrarModal()
      await fetchPolizas()
    }
    setSaving(false)
  }

  function abrirModal() {
    setPaso('cliente')
    setClienteSearch('')
    setClienteSeleccionado(null)
    setForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '' })
    setShowModal(true)
  }

  function cerrarModal() {
    setShowModal(false)
    setClienteSeleccionado(null)
    setPaso('cliente')
  }

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Pólizas</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
            {loading ? 'Cargando...' : `${polizas.length} pólizas en cartera`}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirModal}>
          <Plus size={15} /> Nueva póliza
        </button>
      </div>

      {/* Filters */}
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

      {/* Table */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 130 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} />
            <col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 80 }} /><col style={{ width: 110 }} />
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
                Cargando pólizas...
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pólizas cargadas</div>
                <div style={{ fontSize: 12 }}>Usá el botón "Nueva póliza" o agregá desde el módulo Clientes</div>
              </td></tr>
            ) : filtradas.map(p => {
              const { label, cls } = estadoBadge(p.vencimiento)
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{p.numero}</td>
                  <td style={{ fontWeight: 600 }}>{p.clientes?.nombre || '—'}</td>
                  <td><span className="badge badge-neutral">{p.ramo}</span></td>
                  <td style={{ color: 'var(--slate)', fontSize: 13 }}>{p.compania}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatFecha(p.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{p.moneda}</td>
                  <td><span className={`badge ${cls}`}>{label}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Mobile card list */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtradas.map(p => {
            const { label, cls } = estadoBadge(p.vencimiento)
            return (
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{p.clientes?.nombre || '—'}</div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span className="badge badge-neutral">{p.ramo}</span>
                  <span style={{ fontSize: 12, color: 'var(--slate)', fontFamily: 'monospace', alignSelf: 'center' }}>{p.numero}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p.compania} · {p.moneda} · Vence {formatFecha(p.vencimiento)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MODAL NUEVA PÓLIZA (2 pasos) ─────────────────────────────────── */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: paso === 'cliente' ? 480 : 540 }} onClick={e => e.stopPropagation()}>

            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : 'Nueva póliza'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : '2'} de 2 —{' '}
                  {paso === 'cliente' ? 'Elegí el cliente para esta póliza' : `Cliente: ${clienteSeleccionado?.nombre}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {/* Indicador de pasos */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {['Seleccionar cliente', 'Datos de la póliza'].map((label, i) => {
                const done = (i === 0 && paso === 'poliza')
                const active = (i === 0 && paso === 'cliente') || (i === 1 && paso === 'poliza')
                return (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: done || active ? 'var(--gold)' : 'var(--border)', transition: 'background .2s' }} />
                )
              })}
            </div>

            {/* ── PASO 1: Elegir cliente ── */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
                  <input
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--navy)' }}
                  />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--slate)', fontSize: 13 }}>No se encontraron clientes</div>
                  ) : clientesFiltrados.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setClienteSeleccionado(c); setPaso('poliza') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                        borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer',
                        background: 'white', transition: 'all .12s'
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 1 }}>{c.direccion}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── PASO 2: Datos de la póliza ── */}
            {paso === 'poliza' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>

                  {/* Ramo */}
                  <div className="fgroup">
                    <label>Ramo *</label>
                    <select value={form.ramo} onChange={e => setForm({ ...form, ramo: e.target.value })}
                      style={{ color: form.ramo ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.ramos.map((r:string) => <option key={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* N° Póliza */}
                  <div className="fgroup">
                    <label>N° Póliza *</label>
                    <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                      placeholder="Ej: 4309338" autoFocus />
                  </div>

                  {/* Compañía */}
                  <div className="fgroup">
                    <label>Compañía *</label>
                    <select value={form.compania} onChange={e => setForm({ ...form, compania: e.target.value })}
                      style={{ color: form.compania ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.companias.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Corredor */}
                  <div className="fgroup">
                    <label>Corredor *</label>
                    <select value={form.corredor} onChange={e => setForm({ ...form, corredor: e.target.value })}
                      style={{ color: form.corredor ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Vencimiento */}
                  <div className="fgroup">
                    <label>Vencimiento *</label>
                    <DatePicker value={form.vencimiento} onChange={v => setForm({ ...form, vencimiento: v })} placeholder="Seleccionar fecha" />
                  </div>

                  {/* Moneda */}
                  <div className="fgroup">
                    <label>Moneda *</label>
                    <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}
                      style={{ color: form.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.monedas || []).map((m:string) => <option key={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Cantidad cuotas */}
                  <div className="fgroup">
                    <label>Cantidad de cuotas *</label>
                    <input type="number" min="1" max="36" value={form.cuotas}
                      onChange={e => setForm({ ...form, cuotas: e.target.value, fechasCuotas: [] })}
                      placeholder="Ej: 10" />
                  </div>

                  {/* Fechas por cuota */}
                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Fechas de vencimiento por cuota *
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--slate)', marginLeft: 6 }}>
                        — ingresá la cantidad de cuotas primero
                      </span>
                    </label>
                    <CuotasFechas cuotas={parseInt(form.cuotas) || 0} value={form.fechasCuotas} onChange={v => setForm({ ...form, fechasCuotas: v })} />
                  </div>

                </div>

                {/* Nota */}
                <div className="fgroup" style={{ marginTop: 4 }}>
                  <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--slate)' }}>(opcional)</span></label>
                  <textarea value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })}
                    placeholder="Descripción del bien asegurado"
                    rows={2}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)', lineHeight: 1.5 }}
                    onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
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

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/polizas/page.tsx'

cat > app/siniestros/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>
}

FILEEOF
echo '+ app/siniestros/layout.tsx'

cat > app/siniestros/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, AlertTriangle, X, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'

const ESTADOS   = ['En gestión', 'Documentación', 'Pericial', 'Cerrado']
// TIPOS_SIN stays hardcoded - siniestro types are not in catalogs

const estadoColor: Record<string, string> = {
  'En gestión':    'badge-blue',
  'Documentación': 'badge-warning',
  'Pericial':      'badge-neutral',
  'Cerrado':       'badge-success',
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Cliente  = { id: string; nombre: string; direccion: string }
type Poliza   = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null }
type Siniestro = {
  id: string
  tipo: string
  descripcion: string
  fecha_ocurrencia: string | null
  estado: string
  created_at: string
  polizas: { numero: string; ramo: string; compania: string } | null
  clientes: { nombre: string } | null
}

type Paso = 'cliente' | 'poliza' | 'datos'

export default function SiniestrosPage() {
  const supabase = createClient()

  const [tiposSin, setTiposSin]       = useState<string[]>([])
  const [tiposDoc, setTiposDoc]       = useState<string[]>([])
  const [siniestros, setSiniestros]   = useState<Siniestro[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [polizasCliente, setPolizasCliente] = useState<Poliza[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtro, setFiltro]           = useState('Todos')

  // Modal
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSel, setClienteSel]   = useState<Cliente | null>(null)
  const [polizaSel, setPolizaSel]     = useState<Poliza | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({
    tipo: 'Choque', descripcion: '', fecha_ocurrencia: new Date().toISOString().slice(0,10), estado: 'En gestión'
  })

  useEffect(() => {
    fetchSiniestros()
    fetchClientes()
    Promise.all([
      supabase.from('tipos_siniestro').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
    ]).then(([ts, td]) => {
      setTiposSin((ts.data || []).map((x: any) => x.nombre))
      setTiposDoc((td.data || []).map((x: any) => x.nombre))
    })
  }, [])

  async function fetchSiniestros() {
    setLoading(true)
    const { data } = await supabase
      .from('siniestros')
      .select('*, polizas(numero, ramo, compania), clientes(nombre)')
      .order('created_at', { ascending: false })
    if (data) setSiniestros(data)
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchPolizasCliente(clienteId: string) {
    const { data } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento')
      .eq('cliente_id', clienteId)
      .order('ramo')
    setPolizasCliente(data || [])
  }

  async function guardarSiniestro() {
    if (!clienteSel) return
    setSaving(true)
    const { error } = await supabase.from('siniestros').insert([{
      cliente_id:       clienteSel.id,
      poliza_id:        polizaSel?.id || null,
      tipo:             form.tipo,
      descripcion:      form.descripcion,
      fecha_ocurrencia: form.fecha_ocurrencia || null,
      estado:           form.estado,
    }])
    if (!error) {
      cerrarModal()
      await fetchSiniestros()
    }
    setSaving(false)
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('siniestros').update({ estado }).eq('id', id)
    await fetchSiniestros()
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSel(null); setPolizaSel(null)
    setPolizasCliente([])
    setForm({ tipo: 'Choque', descripcion: '', fecha_ocurrencia: new Date().toISOString().slice(0,10), estado: 'En gestión' })
    setShowModal(true)
  }

  function cerrarModal() { setShowModal(false); setClienteSel(null); setPolizaSel(null); setPaso('cliente') }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  const filtrados = siniestros.filter(s => {
    const q = search.toLowerCase()
    return (!q || (s.clientes?.nombre || '').toLowerCase().includes(q) || (s.polizas?.numero || '').toLowerCase().includes(q) || s.tipo.toLowerCase().includes(q)) &&
           (filtro === 'Todos' || s.estado === filtro)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Siniestros</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
            {loading ? 'Cargando...' : `${siniestros.filter(s => s.estado !== 'Cerrado').length} abiertos · ${siniestros.filter(s => s.estado === 'Cerrado').length} cerrados`}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nuevo siniestro</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente, póliza o tipo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos', ...ESTADOS].map(t =>
            <button key={t} onClick={() => setFiltro(t)} className={`filter-btn ${filtro === t ? 'active' : ''}`}>{t}</button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando siniestros...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay siniestros registrados</div>
          <div style={{ fontSize: 12 }}>Usá el botón "Nuevo siniestro" para registrar uno</div>
        </div>
      ) : filtrados.map(s => (
        <div key={s.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, background: '#FEE2E2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#D94F4F" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{s.clientes?.nombre || '—'}</span>
                <span className={`badge ${estadoColor[s.estado] || 'badge-neutral'}`}>{s.estado}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{s.tipo}</div>
              {s.polizas && (
                <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 4 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{s.polizas.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{s.polizas.numero}</span>
                  {' · '}{s.polizas.compania}
                </div>
              )}
              {s.descripcion && <div style={{ fontSize: 13, color: 'var(--navy)', marginTop: 4 }}>{s.descripcion}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Fecha</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{formatFecha(s.fecha_ocurrencia)}</div>
              {/* Cambiar estado */}
              <select
                value={s.estado}
                onChange={e => cambiarEstado(s.id, e.target.value)}
                style={{ marginTop: 8, padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'white', color: 'var(--navy)' }}
              >
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}

      {/* MODAL NUEVO SINIESTRO (3 pasos) ─────────────────────────*/}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: paso === 'datos' ? 540 : 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : paso === 'poliza' ? 'Seleccionar póliza' : 'Datos del siniestro'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : paso === 'poliza' ? '2' : '3'} de 3
                  {clienteSel && paso !== 'cliente' && ` — ${clienteSel.nombre}`}
                  {polizaSel && paso === 'datos' && ` · ${polizaSel.ramo} ${polizaSel.numero}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {/* Barra de progreso */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza','datos'].map((p, i) => (
                <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .2s',
                  background: (paso === 'poliza' && i <= 1) || (paso === 'datos' && i <= 2) || (paso === 'cliente' && i === 0) ? 'var(--gold)' : 'var(--border)'
                }} />
              ))}
            </div>

            {/* Paso 1: cliente */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--navy)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSel(c); fetchPolizasCliente(c.id); setPaso('poliza') }}
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
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No se encontraron clientes</div>}
                </div>
              </>
            )}

            {/* Paso 2: póliza */}
            {paso === 'poliza' && (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {polizasCliente.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>
                      Este cliente no tiene pólizas cargadas
                    </div>
                  ) : polizasCliente.map(p => (
                    <div key={p.id} onClick={() => { setPolizaSel(p); setPaso('datos') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-neutral">{p.ramo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{p.numero}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                          {p.compania}{p.vencimiento ? ` · Vence ${formatFecha(p.vencimiento)}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                  <button className="btn-outline" onClick={() => { setPolizaSel(null); setPaso('datos') }}>Sin póliza específica →</button>
                </div>
              </>
            )}

            {/* Paso 3: datos */}
            {paso === 'datos' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <div className="fgroup">
                    <label>Tipo de siniestro *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      {tiposSin.map((t: string) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Fecha de ocurrencia</label>
                    <DatePicker value={form.fecha_ocurrencia} onChange={v => setForm({ ...form, fecha_ocurrencia: v })} />
                  </div>
                  <div className="fgroup">
                    <label>Estado inicial</label>
                    <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                      {ESTADOS.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Descripción</label>
                    <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      placeholder="Describí brevemente el siniestro..."
                      rows={3}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('poliza')}>← Cambiar póliza</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={guardarSiniestro} disabled={saving}>
                      {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar siniestro'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/siniestros/page.tsx'

cat > app/usuarios/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Loader2, Shield, User, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRol } from '@/lib/useRol'
import { useRouter } from 'next/navigation'

type Usuario = {
  id: string
  email: string
  nombre: string | null
  rol: 'admin' | 'superadmin'
  activo: boolean
  created_at: string
}

export default function UsuariosPage() {
  const supabase = createClient()
  const { esSuperAdmin, loading: loadingRol } = useRol()
  const router   = useRouter()
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [form, setForm]           = useState({ email: '', nombre: '', rol: 'admin' as 'admin' | 'superadmin', password: '' })

  useEffect(() => {
    if (!loadingRol && !esSuperAdmin) router.push('/dashboard')
  }, [loadingRol, esSuperAdmin])

  useEffect(() => { fetchUsuarios() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function fetchUsuarios() {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('created_at')
    if (data) setUsuarios(data)
    setLoading(false)
  }

  async function crearUsuario() {
    if (!form.email || !form.password) return
    setSaving(true)
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (authErr || !authData.user) {
      showToast('Error: ' + (authErr?.message || 'No se pudo crear'))
      setSaving(false)
      return
    }
    await supabase.from('usuarios').insert([{
      id:     authData.user.id,
      email:  form.email,
      nombre: form.nombre || null,
      rol:    form.rol,
    }])
    setShowModal(false)
    setForm({ email: '', nombre: '', rol: 'admin', password: '' })
    showToast(`Usuario ${form.email} creado`)
    await fetchUsuarios()
    setSaving(false)
  }

  async function cambiarRol(u: Usuario, nuevoRol: 'admin' | 'superadmin') {
    await supabase.from('usuarios').update({ rol: nuevoRol }).eq('id', u.id)
    showToast(`Rol actualizado a ${nuevoRol}`)
    await fetchUsuarios()
  }

  async function toggleActivo(u: Usuario) {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    showToast(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    await fetchUsuarios()
  }

  if (loadingRol) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Usuarios</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Gestión de accesos al sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Nuevo usuario</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {usuarios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay usuarios registrados</div>
            </div>
          ) : usuarios.map(u => (
            <div key={u.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, opacity: u.activo ? 1 : 0.5 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: u.rol === 'superadmin' ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {u.rol === 'superadmin' ? <Shield size={18} color="var(--gold)" /> : <User size={18} color="var(--slate)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.nombre || u.email}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{u.email}</div>
              </div>
              <span className={`badge ${u.rol === 'superadmin' ? 'badge-gold' : 'badge-neutral'}`}>
                {u.rol === 'superadmin' ? 'Super Admin' : 'Admin'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={u.rol} onChange={e => cambiarRol(u, e.target.value as any)}
                  style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'white' }}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <button className={u.activo ? 'btn-outline btn-sm' : 'btn-primary btn-sm'} style={{ fontSize: 12 }} onClick={() => toggleActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo usuario</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div className="fgroup"><label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@fascioli.com.uy" autoFocus /></div>
            <div className="fgroup"><label>Nombre</label>
              <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre completo" /></div>
            <div className="fgroup"><label>Contraseña inicial *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Mínimo 6 caracteres" /></div>
            <div className="fgroup"><label>Rol</label>
              <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value as any})}>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearUsuario} disabled={saving || !form.email || !form.password}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creando...</> : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>{toast}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/usuarios/page.tsx'

cat > app/vencimientos/layout.tsx << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-content">{children}</main></div>
}

FILEEOF
echo '+ app/vencimientos/layout.tsx'

cat > app/vencimientos/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Search, Phone, Mail, Bell, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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

type Item = {
  id: string
  numero: string
  ramo: string
  compania: string
  vencimiento: string | null
  corredor: string
  moneda: string
  cliente_nombre: string
  cliente_tel: string
  cliente_email: string
  dias: number | null
}

export default function VencimientosPage() {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtro, setFiltro]   = useState(90)
  const [notificados, setNotificados] = useState<Record<string, boolean>>({})

  useEffect(() => { fetchVencimientos() }, [])

  async function fetchVencimientos() {
    setLoading(true)
    const { data } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento, corredor, moneda, clientes(nombre, tel, email)')
      .order('vencimiento', { ascending: true })

    if (data) {
      setItems(data.map(p => ({
        id:              p.id,
        numero:          p.numero,
        ramo:            p.ramo,
        compania:        p.compania,
        vencimiento:     p.vencimiento,
        corredor:        p.corredor,
        moneda:          p.moneda,
        cliente_nombre:  (p.clientes as any)?.nombre || '—',
        cliente_tel:     (p.clientes as any)?.tel || '',
        cliente_email:   (p.clientes as any)?.email || '',
        dias:            diasHasta(p.vencimiento),
      })))
    }
    setLoading(false)
  }

  const filtrados = items.filter(v => {
    const q = search.toLowerCase()
    const matchQ = !q || v.cliente_nombre.toLowerCase().includes(q) || v.numero.toLowerCase().includes(q)
    if (filtro === 0)  return matchQ && v.dias !== null && v.dias < 0
    if (filtro === -1) return matchQ
    return matchQ && v.dias !== null && v.dias >= 0 && v.dias <= filtro
  })

  const urgentes   = filtrados.filter(v => v.dias !== null && v.dias >= 0 && v.dias <= 7)
  const proximos   = filtrados.filter(v => v.dias !== null && v.dias > 7 && v.dias <= 30)
  const planificados = filtrados.filter(v => v.dias !== null && v.dias > 30)
  const vencidas   = filtrados.filter(v => v.dias !== null && v.dias < 0)

  function Section({ title, items, dotColor }: { title: string; items: Item[]; dotColor: string }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{title}</h2>
          <span style={{ fontSize: 12, color: 'var(--slate)', background: '#EEF2F8', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>
        </div>
        {items.map(v => (
          <div key={v.id} style={{
            background: 'white', borderRadius: 12, border: '1px solid var(--border)',
            padding: '16px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14,
            borderLeft: `3px solid ${dotColor}`
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 10, flexShrink: 0,
              background: v.dias !== null && v.dias < 0 ? '#FEE2E2' : v.dias !== null && v.dias <= 7 ? '#FEE2E2' : v.dias !== null && v.dias <= 30 ? '#FEF3C7' : '#EEF2F8',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: v.dias !== null && v.dias < 0 ? '#991B1B' : v.dias !== null && v.dias <= 7 ? '#991B1B' : v.dias !== null && v.dias <= 30 ? '#92400E' : 'var(--navy)' }}>
                {v.dias !== null ? Math.abs(v.dias) : '?'}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: .7, color: 'var(--slate)' }}>
                {v.dias !== null && v.dias < 0 ? 'venc.' : 'días'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{v.cliente_nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-neutral">{v.ramo}</span>
                <span style={{ fontFamily: 'monospace' }}>{v.numero}</span>
                <span>{v.compania}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Vence</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatFecha(v.vencimiento)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                {v.cliente_tel && <a href={`tel:${v.cliente_tel}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Phone size={12} /></a>}
                {v.cliente_email && <a href={`mailto:${v.cliente_email}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Mail size={12} /></a>}
                <button
                  className={notificados[v.id] ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
                  style={{ fontSize: 11 }}
                  onClick={() => setNotificados(prev => ({ ...prev, [v.id]: true }))}
                >
                  <Bell size={12} /> {notificados[v.id] ? 'Reenviar' : 'Notificar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Vencimientos</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Pólizas ordenadas por proximidad de vencimiento</p>
      </div>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Vencidas',    count: vencidas.length,    bg: '#FEE2E2', color: '#991B1B' },
          { label: '≤ 7 días',   count: urgentes.length,    bg: '#FEE2E2', color: '#991B1B' },
          { label: '8–30 días',  count: proximos.length,    bg: '#FEF3C7', color: '#92400E' },
          { label: '31–90 días', count: planificados.length, bg: '#EEF2F8', color: 'var(--navy)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: s.color, opacity: .8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{l:'30 días',v:30},{l:'90 días',v:90},{l:'180 días',v:180},{l:'Vencidas',v:0},{l:'Todas',v:-1}].map(t =>
            <button key={t.v} onClick={() => setFiltro(t.v)} className={`filter-btn ${filtro === t.v ? 'active' : ''}`}>{t.l}</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando vencimientos...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin vencimientos en este rango</div>
          <div style={{ fontSize: 12 }}>Probá cambiando el filtro o agregando pólizas con fecha de vencimiento</div>
        </div>
      ) : (
        <>
          <Section title="Vencidas" items={vencidas} dotColor="#D94F4F" />
          <Section title="Urgentes — vencen en 7 días o menos" items={urgentes} dotColor="#D94F4F" />
          <Section title="Próximas — 8 a 30 días" items={proximos} dotColor="#D97706" />
          <Section title="Planificadas — 31 a 90 días" items={planificados} dotColor="#4A80D4" />
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/vencimientos/page.tsx'

cat > components/DatePicker.tsx << 'FILEEOF'
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS  = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', disabled }: Props) {
  const [open, setOpen]         = useState(false)
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.slice(0,4)) : new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5,7)) - 1 : new Date().getMonth())
  const [pos, setPos]           = useState({ top: 0, left: 0, width: 0 })
  const triggerRef              = useRef<HTMLDivElement>(null)
  const calRef                  = useRef<HTMLDivElement>(null)

  // Calculate dropdown position when opening
  function openCalendar() {
    if (disabled || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const calH = 340 // approximate calendar height
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= calH
      ? rect.bottom + window.scrollY + 6
      : rect.top + window.scrollY - calH - 6
    setPos({ top, left: rect.left + window.scrollX, width: Math.max(rect.width, 280) })
    setOpen(o => !o)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        calRef.current && !calRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on scroll
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.slice(0,4)))
      setViewMonth(parseInt(value.slice(5,7)) - 1)
    }
  }, [value])

  function formatDisplay(v: string) {
    if (!v) return ''
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year: number, month: number) {
    const d = new Date(year, month, 1).getDay()
    return d === 0 ? 6 : d - 1
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const today    = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const daysInMonth    = getDaysInMonth(viewYear, viewMonth)
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth)

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const calendar = (
    <div
      ref={calRef}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        width: Math.max(pos.width, 280),
        zIndex: 9999,
        background: 'white',
        borderRadius: 14,
        border: '1.5px solid var(--border)',
        boxShadow: '0 16px 48px rgba(15,30,53,.18)',
        padding: '16px',
        animation: 'dpFadeIn .15s ease',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Month/Year nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--slate)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        ><ChevronLeft size={16} /></button>

        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>{MESES[viewMonth]}</span>
          <select value={viewYear} onChange={e => setViewYear(+e.target.value)}
            style={{ border: 'none', background: 'none', fontWeight: 800, fontSize: 15, color: 'var(--navy)', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            {Array.from({ length: 15 }, (_, i) => today.getFullYear() - 2 + i).map(y =>
              <option key={y} value={y}>{y}</option>
            )}
          </select>
        </div>

        <button onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--slate)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        ><ChevronRight size={16} /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
        {DIAS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--slate)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const mm  = String(viewMonth + 1).padStart(2, '0')
          const dd  = String(day).padStart(2, '0')
          const str = `${viewYear}-${mm}-${dd}`
          const isSel   = str === value
          const isToday = str === todayStr
          return (
            <div key={idx} onClick={() => selectDay(day)}
              style={{
                textAlign: 'center', padding: '7px 4px', borderRadius: 8,
                fontSize: 13.5, fontWeight: isSel || isToday ? 700 : 400,
                cursor: 'pointer', transition: 'all .1s',
                background: isSel ? 'var(--navy)' : isToday ? 'var(--gold-pale)' : 'transparent',
                color: isSel ? 'var(--gold)' : isToday ? 'var(--gold)' : 'var(--navy)',
                border: isToday && !isSel ? '1.5px solid var(--gold)' : '1.5px solid transparent',
              }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = '#F4F7FB' }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = isToday ? 'var(--gold-pale)' : 'transparent' }}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { onChange(todayStr); setOpen(false) }}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-pale)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >Hoy</button>
        {value && (
          <button onClick={() => { onChange(''); setOpen(false) }}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >Limpiar</button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Trigger */}
      <div ref={triggerRef} onClick={openCalendar} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 13px',
        border: `1.5px solid ${open ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 8,
        background: disabled ? '#F8FAFC' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color .14s',
        userSelect: 'none',
      }}>
        <Calendar size={15} color={value ? 'var(--navy)' : 'var(--slate)'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14, color: value ? 'var(--navy)' : 'var(--slate)' }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <span onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ color: 'var(--slate)', fontSize: 16, lineHeight: 1, padding: '0 2px', cursor: 'pointer' }}>×</span>
        )}
      </div>

      {/* Portal calendar — renders outside any overflow:hidden container */}
      {open && typeof document !== 'undefined' && createPortal(calendar, document.body)}

      <style>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(4px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </>
  )
}

FILEEOF
echo '+ components/DatePicker.tsx'

cat > components/Sidebar.tsx << 'FILEEOF'
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, AlertTriangle, FolderOpen, Settings, LogOut, Menu, X, History, UserCog
} from 'lucide-react'
import { useRol } from '@/lib/useRol'

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos' },
  { href: '/vencimientos', icon: Bell,            label: 'Vencimientos' },
  { href: '/siniestros',   icon: AlertTriangle,   label: 'Siniestros' },
  { href: '/documentos',   icon: FolderOpen,      label: 'Documentos' },
]

const LIMIT_BYTES = 1 * 1024 * 1024 * 1024

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [open, setOpen]         = useState(false)
  const { esSuperAdmin }          = useRol()
  const [usedBytes, setUsedBytes] = useState<number | null>(null)

  useEffect(() => { fetchStorageUsage() }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false) }, [pathname])

  async function fetchStorageUsage() {
    try {
      const { data } = await supabase.from('documentos').select('tamanio_bytes')
      if (data) setUsedBytes(data.reduce((s, d) => s + (d.tamanio_bytes || 0), 0))
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pct      = usedBytes !== null ? Math.min((usedBytes / LIMIT_BYTES) * 100, 100) : 0
  const barColor = pct > 80 ? '#D94F4F' : pct > 50 ? '#D97706' : '#2E9668'

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menú">
        {open ? <X size={18} color="var(--gold)" /> : <>
          <span /><span /><span />
        </>}
      </button>

      {/* Overlay — mobile only */}
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'center', padding: '20px 16px' }}>
          <img src="/logo-fascioli.svg" alt="Fascioli Seguros"
            style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block' }} />
        </div>

        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <div className="nav-section">Menú</div>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
          <div className="nav-section" style={{ marginTop: 10 }}>Sistema</div>
          <Link href="/configuracion" className={`nav-item ${pathname.startsWith('/configuracion') ? 'active' : ''}`}>
            <Settings size={17} />
            Configuración
          </Link>
          {esSuperAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: 10 }}>Super Admin</div>
              <Link href="/usuarios" className={`nav-item ${pathname.startsWith('/usuarios') ? 'active' : ''}`}>
                <UserCog size={17} />
                Usuarios
              </Link>
              <Link href="/historial" className={`nav-item ${pathname.startsWith('/historial') ? 'active' : ''}`}>
                <History size={17} />
                Historial
              </Link>
            </>
          )}
        </nav>

        <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          {/* Storage */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Almacenamiento
              </span>
              <span style={{ fontSize: 11, color: 'var(--slate-light)' }}>
                {usedBytes !== null ? `${formatBytes(usedBytes)} / 1 GB` : '...'}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: barColor, transition: 'width .6s ease' }} />
            </div>
            {pct > 80 && (
              <div style={{ fontSize: 10, color: '#D94F4F', marginTop: 4, fontWeight: 600 }}>
                Espacio casi lleno
              </div>
            )}
          </div>

          {/* Logout */}
          <div style={{ paddingBottom: 16 }}>
            <button
              onClick={handleLogout}
              className="nav-item"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--slate-light)', width: '100%' }}
            >
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

FILEEOF
echo '+ components/Sidebar.tsx'

cat > lib/audit.ts << 'FILEEOF'
import { createClient } from '@/lib/supabase'

type Accion = 'crear' | 'editar' | 'eliminar'
type Tabla  = 'clientes' | 'polizas' | 'pagos' | 'siniestros' | 'documentos'

export async function registrarAudit({
  accion,
  tabla,
  registroId,
  descripcion,
  datosAntes,
  datosDespues,
}: {
  accion:       Accion
  tabla:        Tabla
  registroId?:  string
  descripcion:  string
  datosAntes?:  object | null
  datosDespues?: object | null
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_log').insert([{
      usuario_id:    user.id,
      usuario_email: user.email,
      accion,
      tabla,
      registro_id:   registroId || null,
      descripcion,
      datos_antes:   datosAntes   || null,
      datos_despues: datosDespues || null,
    }])
  } catch (e) {
    // Audit failures should never block the main operation
    console.warn('Audit log failed:', e)
  }
}

FILEEOF
echo '+ lib/audit.ts'

cat > lib/supabase-server.ts << 'FILEEOF'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

FILEEOF
echo '+ lib/supabase-server.ts'

cat > lib/supabase.ts << 'FILEEOF'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

FILEEOF
echo '+ lib/supabase.ts'

cat > lib/useRol.ts << 'FILEEOF'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useRol() {
  const [rol, setRol]       = useState<'admin' | 'superadmin' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRol() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()
      setRol((data?.rol as 'admin' | 'superadmin') || 'admin')
      setLoading(false)
    }
    fetchRol()
  }, [])

  return { rol, loading, esSuperAdmin: rol === 'superadmin' }
}

FILEEOF
echo '+ lib/useRol.ts'

echo ''
echo 'Listo:'
echo '   git add .'
echo '   git commit -m "feat: roles, historial de cambios y audit log"'
echo '   git push'
