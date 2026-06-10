#!/bin/bash
set -e
echo 'Eliminando todo lo hardcodeado...'

cat > app/configuracion/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; nombre: string }
type Tabla = 'companias' | 'ramos' | 'corredores' | 'metodos_pago' | 'tipos_siniestro' | 'tipos_documento' | 'monedas'

const SECCIONES: { tabla: Tabla; titulo: string; icono: string; placeholder: string }[] = [
  { tabla: 'companias',       titulo: 'Compañías aseguradoras',   icono: '🏢', placeholder: 'Ej: BSE, SURA, Mapfre...' },
  { tabla: 'ramos',           titulo: 'Ramos / Tipos de seguro',  icono: '🏷️', placeholder: 'Ej: Incendio, RC...' },
  { tabla: 'corredores',      titulo: 'Corredores',               icono: '👤', placeholder: 'Ej: Fascioli...' },
  { tabla: 'metodos_pago',    titulo: 'Métodos de pago',          icono: '💳', placeholder: 'Ej: Transferencia...' },
  { tabla: 'tipos_siniestro', titulo: 'Tipos de siniestro',       icono: '🛡️', placeholder: 'Ej: Choque, Robo...' },
  { tabla: 'tipos_documento', titulo: 'Tipos de documento',       icono: '📎', placeholder: 'Ej: Póliza, Endoso...' },
  { tabla: 'monedas',         titulo: 'Monedas',                  icono: '💵', placeholder: 'Ej: U$S, $, €...' },
]

function Seccion({ tabla, titulo, icono, placeholder }: typeof SECCIONES[0]) {
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
      showToast(`❌ ${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    } else {
      setNuevo('')
      showToast(`✓ "${nombre}" agregado`)
      await fetch()
    }
    setSaving(false)
  }

  async function eliminar(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) {
      showToast(`❌ No se pudo eliminar — puede estar en uso`)
    } else {
      showToast(`🗑 "${item.nombre}" eliminado`)
      await fetch()
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icono}</span>
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
        <div style={{ padding: '10px 16px', background: toast.startsWith('❌') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('❌') ? '#991B1B' : '#1A7A4E' }}>
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
echo '✅ app/configuracion/page.tsx'

cat > app/clientes/ClienteDetalle.tsx << 'FILEEOF'
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
    ramos: string[]; companias: string[]; corredores: string[]; metodos: string[]; monedas: string[]
  }>({ ramos: [], companias: [], corredores: [], metodos: [], monedas: [] })
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
    const [r, c, co, m, mon] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('metodos_pago').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x: any) => x.nombre),
      companias: (c.data || []).map((x: any) => x.nombre),
      corredores:(co.data || []).map((x: any) => x.nombre),
      metodos:   (m.data || []).map((x: any) => x.nombre),
      monedas:   (mon.data || []).map((x: any) => x.nombre),
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
                  {(catalogos.monedas || []).map((m: string) => <option key={m}>{m}</option>)}
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

FILEEOF
echo '✅ app/clientes/ClienteDetalle.tsx'

cat > app/polizas/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, X, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// Catalogs loaded from Supabase
const MESES     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function mesesACuotaMes(idx: number[]) {
  return idx.map((m, i) => `${i+1}/${MESES[m]}`).join(' - ')
}

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

function MesesPicker({ cuotas, value, onChange }: { cuotas: number; value: number[]; onChange: (v: number[]) => void }) {
  const [open, setOpen] = useState(false)
  function toggle(idx: number) {
    if (value.includes(idx)) onChange(value.filter(m => m !== idx).sort((a,b)=>a-b))
    else if (value.length < cuotas) onChange([...value, idx].sort((a,b)=>a-b))
  }
  const label = value.length === 0 ? 'Seleccionar meses de cobro...' : mesesACuotaMes(value)
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '10px 13px', border: `1.5px solid ${open ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 8, fontSize: value.length > 0 ? 12 : 13.5, cursor: 'pointer', background: 'white', color: value.length === 0 ? 'var(--slate)' : 'var(--navy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
        <span style={{ marginLeft: 8, color: 'var(--slate)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'white', border: '1.5px solid var(--border)', borderRadius: 10, marginTop: 4, padding: 12, boxShadow: '0 8px 24px rgba(15,30,53,.12)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Seleccioná {cuotas} mes{cuotas !== 1 ? 'es' : ''} ({value.length}/{cuotas})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {MESES.map((m, idx) => {
              const sel = value.includes(idx)
              const disabled = !sel && value.length >= cuotas
              return (
                <div key={idx} onClick={() => !disabled && toggle(idx)} style={{ padding: '7px 4px', borderRadius: 7, textAlign: 'center', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', background: sel ? 'var(--navy)' : disabled ? '#F8FAFC' : '#F4F7FB', color: sel ? 'var(--gold)' : disabled ? 'var(--slate-light)' : 'var(--navy)', border: sel ? '1.5px solid var(--navy)' : '1.5px solid transparent', transition: 'all .12s' }}>
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
    ramo: 'Incendio', compania: 'BSE', numero: '', vencimiento: '',
    corredor: 'Fascioli', moneda: 'U$S', cuotas: '', mesesIdx: [] as number[]
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
      cuota_mes:   mesesACuotaMes(form.mesesIdx),
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
    setForm({ ramo: 'Incendio', compania: 'BSE', numero: '', vencimiento: '', corredor: 'Fascioli', moneda: 'U$S', cuotas: '', mesesIdx: [] })
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
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
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
      </div>

      {/* ── MODAL NUEVA PÓLIZA (2 pasos) ─────────────────────────────────── */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: paso === 'cliente' ? 480 : 540 }} onClick={e => e.stopPropagation()}>

            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? '👥 Seleccionar cliente' : '📄 Nueva póliza'}
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
                  <div className="fgroup">
                    <label>Ramo *</label>
                    <select value={form.ramo} onChange={e => setForm({ ...form, ramo: e.target.value })}>
                      {catalogos.ramos.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>N° Póliza *</label>
                    <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Ej: 4309338" autoFocus />
                  </div>
                  <div className="fgroup">
                    <label>Compañía</label>
                    <select value={form.compania} onChange={e => setForm({ ...form, compania: e.target.value })}>
                      {catalogos.companias.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Corredor</label>
                    <select value={form.corredor} onChange={e => setForm({ ...form, corredor: e.target.value })}>
                      {catalogos.corredores.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Vencimiento</label>
                    <input type="date" value={form.vencimiento} onChange={e => setForm({ ...form, vencimiento: e.target.value })} />
                  </div>
                  <div className="fgroup">
                    <label>Moneda</label>
                    <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}>
                      <option value="U$S">U$S (dólares)</option>
                      <option value="$">$ (pesos)</option>
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Cantidad de cuotas</label>
                    <input type="number" min="1" max="36" value={form.cuotas}
                      onChange={e => setForm({ ...form, cuotas: e.target.value, mesesIdx: [] })}
                      placeholder="Ej: 10" />
                  </div>
                  <div className="fgroup">
                    <label>Meses de cobro</label>
                    <MesesPicker cuotas={parseInt(form.cuotas) || 0} value={form.mesesIdx} onChange={v => setForm({ ...form, mesesIdx: v })} />
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

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

FILEEOF
echo '✅ app/polizas/page.tsx'

cat > app/siniestros/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, AlertTriangle, X, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
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

      {/* ── MODAL NUEVO SINIESTRO (3 pasos) ─────────────────────────── */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: paso === 'datos' ? 540 : 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? '👥 Seleccionar cliente' : paso === 'poliza' ? '📄 Seleccionar póliza' : '🛡️ Datos del siniestro'}
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
                    <input type="date" value={form.fecha_ocurrencia} onChange={e => setForm({ ...form, fecha_ocurrencia: e.target.value })} />
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
echo '✅ app/siniestros/page.tsx'

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
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
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
      </div>

      {/* ── MODAL SUBIR (3 pasos: cliente → póliza → archivo) ── */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? '👥 Seleccionar cliente' : paso === 'poliza' ? '📄 Seleccionar póliza' : '📎 Subir archivo'}
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
                      <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
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
echo '✅ app/documentos/page.tsx'

echo ''
echo '🎉 Listo:'
echo '   git add .'
echo '   git commit -m "feat: cero hardcode, todo viene de Supabase"'
echo '   git push'
