'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, X, ChevronRight, Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase'
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
    const { error } = await supabase.from('polizas').insert([{
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
    const { error } = await supabase.from('pagos').upsert([{
      poliza_id:  showPagoModal.polizaId,
      cuota_num:  showPagoModal.cuotaNum,
      fecha:      pagoForm.fecha,
      metodo:     pagoForm.metodo,
      referencia: pagoForm.referencia,
    }], { onConflict: 'poliza_id,cuota_num' })
    if (!error) {
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
    await supabase.from('polizas').delete().eq('id', polizaId)
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
          <div key={pol.id} className="poliza-card">
            <div className="poliza-card-header" onClick={() => setOpenCards(prev => ({ ...prev, [pol.id]: !prev[pol.id] }))}>
              <div className="ramo-dot" style={{ background: ramoDot(pol.ramo) }} />
              <div>
                <div className="poliza-ramo">{pol.ramo}</div>
                <div className="poliza-id">{pol.numero}</div>
              </div>
              <div style={{ flex: 1 }} />
              <span className="badge badge-neutral" style={{ marginRight: 8 }}>{pol.compania}</span>
              <span className={`badge ${cls}`}>{label}</span>
              <ChevronRight size={16} style={{ marginLeft: 10, color: 'var(--slate)', transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : '' }} />
            </div>

            {isOpen && (
              <div className="poliza-card-body open">
                <div className="poliza-grid">
                  <div className="poliza-field"><div className="field-label">N° Póliza</div><div className="field-val" style={{ fontFamily: 'monospace' }}>{pol.numero}</div></div>
                  <div className="poliza-field"><div className="field-label">Vencimiento</div><div className="field-val">{formatFecha(pol.vencimiento)}</div></div>
                  <div className="poliza-field"><div className="field-label">Moneda</div><div className="field-val">{pol.moneda}</div></div>
                  <div className="poliza-field"><div className="field-label">Corredor</div><div className="field-val">{pol.corredor}</div></div>
                  <div className="poliza-field"><div className="field-label">Cuotas</div><div className="field-val">{pol.cuotas || '—'}</div></div>
                  <div className="poliza-field"><div className="field-label">Cuota y mes</div><div className="field-val" style={{ fontSize: 12 }}>{pol.cuota_mes || '—'}</div></div>
                </div>
                {pol.nota && (
                  <div style={{ background: '#F4F7FB', borderRadius: 8, padding: '10px 14px', marginBottom: 12, borderLeft: '3px solid var(--gold)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', marginBottom: 4 }}>Nota</div>
                    <div style={{ fontSize: 13.5, color: 'var(--navy)' }}>{pol.nota}</div>
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
            )}
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

