'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, X, ChevronRight, Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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
  pagos?: Record<number, { id: string; fecha: string; metodo: string; referencia: string }>
  documentos?: Documento[]
}

type Props = { id: string; nombre: string; onBack: () => void }

const MESES     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Convierte array de índices de meses [0,1,2] a string "1/Ene - 2/Feb - 3/Mar"
function mesesACuotaMes(mesesIdx: number[]): string {
  return mesesIdx.map((m, i) => `${i+1}/${MESES[m]}`).join(' - ')
}

// Picker de meses con checkboxes
function MesesPicker({ cuotas, value, onChange }: { cuotas: number; value: number[]; onChange: (v: number[]) => void }) {
  const [open, setOpen] = useState(false)

  function toggleMes(idx: number) {
    if (value.includes(idx)) {
      onChange(value.filter(m => m !== idx).sort((a,b) => a-b))
    } else if (value.length < cuotas) {
      onChange([...value, idx].sort((a,b) => a-b))
    }
  }

  const label = value.length === 0
    ? 'Seleccionar meses de cobro...'
    : mesesACuotaMes(value)

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 13px', border: `1.5px solid ${open ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 8, fontSize: 13.5, cursor: 'pointer', background: 'white',
          color: value.length === 0 ? 'var(--slate)' : 'var(--navy)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: value.length > 0 ? 12 : 13.5 }}>{label}</span>
        <span style={{ marginLeft: 8, color: 'var(--slate)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'white', border: '1.5px solid var(--border)', borderRadius: 10,
          marginTop: 4, padding: 12,
          boxShadow: '0 8px 24px rgba(15,30,53,.12)'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Seleccioná {cuotas} mes{cuotas !== 1 ? 'es' : ''} ({value.length}/{cuotas})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {MESES.map((m, idx) => {
              const sel = value.includes(idx)
              const disabled = !sel && value.length >= cuotas
              return (
                <div
                  key={idx}
                  onClick={() => !disabled && toggleMes(idx)}
                  style={{
                    padding: '7px 4px', borderRadius: 7, textAlign: 'center',
                    fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                    background: sel ? 'var(--navy)' : disabled ? '#F8FAFC' : '#F4F7FB',
                    color: sel ? 'var(--gold)' : disabled ? 'var(--slate-light)' : 'var(--navy)',
                    transition: 'all .12s',
                    border: sel ? '1.5px solid var(--navy)' : '1.5px solid transparent',
                  }}
                >
                  {m}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => onChange([])} style={{ fontSize: 12, color: 'var(--slate)', background: 'none', border: 'none', cursor: 'pointer' }}>Limpiar</button>
            <button onClick={() => setOpen(false)} className="btn-primary btn-sm">Confirmar</button>
          </div>
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
  const [showPagoModal, setShowPagoModal]     = useState<{ polizaId: string; cuotaNum: number; ramo: string } | null>(null)
  const [savingPoliza, setSavingPoliza] = useState(false)
  const [savingPago, setSavingPago]    = useState(false)
  const [polizaForm, setPolizaForm]   = useState({ ramo: 'Incendio', compania: 'BSE', numero: '', vencimiento: '', corredor: 'Fascioli', moneda: 'U$S', cuotas: '', mesesIdx: [] as number[] })
  const [pagoForm, setPagoForm]       = useState({ fecha: new Date().toISOString().slice(0, 10), metodo: 'Transferencia', referencia: '' })
  const supabase                      = createClient()
  const [catalogos, setCatalogos]     = useState<{
    ramos: string[]; companias: string[]; corredores: string[]; metodos: string[]
  }>({ ramos: [], companias: [], corredores: [], metodos: [] })
  const [nuevoCorreder, setNuevoCorreder] = useState('')
  const [showNuevoCorreder, setShowNuevoCorreder] = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)
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
    const [r, c, co, m] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('metodos_pago').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x: any) => x.nombre),
      companias: (c.data || []).map((x: any) => x.nombre),
      corredores:(co.data || []).map((x: any) => x.nombre),
      metodos:   (m.data || []).map((x: any) => x.nombre),
    })
  }

  async function crearCorredor() {
    const nombre = nuevoCorreder.trim()
    if (!nombre) return
    await supabase.from('corredores').insert([{ nombre }])
    setNuevoCorreder('')
    setShowNuevoCorreder(false)
    await fetchCatalogos()
    setPolizaForm(prev => ({ ...prev, corredor: nombre }))
    showToast(`✓ Corredor "${nombre}" creado`)
  }

  async function guardarPoliza() {
    if (!polizaForm.numero.trim()) return
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
      cuota_mes:    mesesACuotaMes(polizaForm.mesesIdx),
    }])
    if (!error) {
      setShowPolizaModal(false)
      setPolizaForm({ ramo: 'Incendio', compania: 'BSE', numero: '', vencimiento: '', corredor: 'Fascioli', moneda: 'U$S', cuotas: '', mesesIdx: [] })
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
    showToast(`🗑 "${doc.nombre}" eliminado`)
  }

  async function subirDocumento(file: File, poliza: { id: string; ramo: string; numero: string }) {
    setUploadingDoc(poliza.id)
    const path = `${id}/${poliza.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`

    const { error: storageErr } = await supabase.storage
      .from('documentos')
      .upload(path, file, { upsert: false })

    if (storageErr) {
      showToast(`❌ Error al subir: ${storageErr.message}`)
      setUploadingDoc(null)
      return
    }

    await supabase.from('documentos').insert([{
      nombre:        file.name,
      tipo:          'Póliza',
      storage_path:  path,
      tamanio_bytes: file.size,
      cliente_id:    id,
      poliza_id:     poliza.id,
    }])

    setUploadingDoc(null)
    setUploadPolizaSel(null)
    await fetchPolizas()
    showToast(`✓ "${file.name}" subido correctamente`)
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
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
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
                              ? <div className="cuota-sub">✓ {pago.fecha} · {pago.metodo}{pago.referencia ? ` · Ref: ${pago.referencia}` : ''}</div>
                              : <div className="cuota-sub">Pendiente de pago</div>
                            }
                          </div>
                          {pago
                            ? <>
                                <span className="cuota-paid-tag">✓ Pagada</span>
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
                            {doc.nombre.endsWith('.pdf') ? '📄' : doc.nombre.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📎'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--slate)' }}>{doc.tipo}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-primary btn-sm" onClick={() => abrirDocumento(doc)}>
                              📄 Abrir
                            </button>
                            <button
                              className="btn-outline btn-sm"
                              style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }}
                              onClick={() => eliminarDocumento(doc, pol.numero)}
                              title="Eliminar documento"
                            >
                              🗑
                            </button>
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
                    onClick={() => { setUploadPolizaSel({ id: pol.id, ramo: pol.ramo, numero: pol.numero }); fileInputRef.current?.click() }}
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
          <div className="pago-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>📄 Nueva póliza</h3>
              <button onClick={() => setShowPolizaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>Cliente: {nombre}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup">
                <label>Ramo *</label>
                <select value={polizaForm.ramo} onChange={e => setPolizaForm({ ...polizaForm, ramo: e.target.value })}>
                  {catalogos.ramos.map((r: string) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label>N° Póliza *</label>
                <input value={polizaForm.numero} onChange={e => setPolizaForm({ ...polizaForm, numero: e.target.value })} placeholder="Ej: 4309338" autoFocus />
              </div>
              <div className="fgroup">
                <label>Compañía</label>
                <select value={polizaForm.compania} onChange={e => setPolizaForm({ ...polizaForm, compania: e.target.value })}>
                  {catalogos.companias.map((c: string) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label>Corredor</label>
                {showNuevoCorreder ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={nuevoCorreder} onChange={e => setNuevoCorreder(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && crearCorredor()}
                      placeholder="Nombre del corredor" autoFocus
                      style={{ flex: 1, padding: '10px 13px', border: '1.5px solid var(--gold)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: 'var(--navy)' }} />
                    <button className="btn-primary btn-sm" onClick={crearCorredor} style={{ padding: '8px 12px' }}>✓</button>
                    <button className="btn-outline btn-sm" onClick={() => { setShowNuevoCorreder(false); setNuevoCorreder('') }} style={{ padding: '8px 12px' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={polizaForm.corredor} onChange={e => setPolizaForm({ ...polizaForm, corredor: e.target.value })} style={{ flex: 1 }}>
                      {catalogos.corredores.map((c: string) => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn-outline btn-sm" onClick={() => setShowNuevoCorreder(true)} title="Crear corredor" style={{ padding: '8px 12px', fontSize: 16, flexShrink: 0 }}>+</button>
                  </div>
                )}
              </div>
              <div className="fgroup">
                <label>Vencimiento</label>
                <input type="date" value={polizaForm.vencimiento} onChange={e => setPolizaForm({ ...polizaForm, vencimiento: e.target.value })} />
              </div>
              <div className="fgroup">
                <label>Moneda</label>
                <select value={polizaForm.moneda} onChange={e => setPolizaForm({ ...polizaForm, moneda: e.target.value })}>
                  <option value="U$S">U$S (dólares)</option>
                  <option value="$">$ (pesos)</option>
                </select>
              </div>
              <div className="fgroup">
                <label>Cantidad de cuotas</label>
                <input type="number" min="1" max="36" value={polizaForm.cuotas} onChange={e => setPolizaForm({ ...polizaForm, cuotas: e.target.value })} placeholder="Ej: 10" />
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Meses de cobro</label>
                <MesesPicker
                  cuotas={parseInt(polizaForm.cuotas) || 0}
                  value={polizaForm.mesesIdx}
                  onChange={v => setPolizaForm({ ...polizaForm, mesesIdx: v })}
                />
                {polizaForm.mesesIdx.length > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 5 }}>
                    → {mesesACuotaMes(polizaForm.mesesIdx)}
                  </div>
                )}
              </div>
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
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>💳 Registrar pago</h3>
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {nombre} · {showPagoModal.ramo} · Cuota {showPagoModal.cuotaNum}
            </div>
            <div className="fgroup"><label>Fecha de pago</label><input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} /></div>
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
                {savingPago ? <><Loader2 size={14} /> Guardando...</> : '✓ Confirmar pago'}
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
          background: toast.startsWith('❌') ? '#D94F4F' : 'var(--navy)',
          color: 'white', padding: '12px 20px', borderRadius: 10,
          fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)',
          borderLeft: `3px solid ${toast.startsWith('❌') ? '#FF8080' : 'var(--gold)'}`,
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

