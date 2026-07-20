'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Search, X, Loader2, Paperclip, ArrowLeft, FileText, CreditCard, Bell, Upload, Download, Trash2, Pencil, AlertTriangle, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { reconciliarControlesMensuales } from '@/lib/controlesMensuales'
import DatePicker from '@/components/DatePicker'
import ExportButton from '@/components/ExportButton'
import { Pagination, paginate, PAGE_SIZE } from '@/components/Pagination'
import { SortHeader } from '@/components/SortHeader'
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter'
import { useSortFilter } from '@/hooks/useSortFilter'

// Catalogs loaded from Supabase

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}


function parseFechasCuotaMes(cuotaMes: string): string[] {
  if (!cuotaMes) return []
  const meses: Record<string,string> = { Ene:'01',Feb:'02',Mar:'03',Abr:'04',May:'05',Jun:'06',Jul:'07',Ago:'08',Sep:'09',Oct:'10',Nov:'11',Dic:'12' }
  return cuotaMes.split(' - ').map(item => {
    const parts = item.split('/')
    if (parts.length < 4) return ''
    const d = parts[1].padStart(2,'0'), m = meses[parts[2]] || '01', y = `20${parts[3]}`
    return `${y}-${m}-${d}`
  })
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

function estadoBadge(venc: string | null, renovada?: boolean, renovacionMensual?: boolean) {
  if (renovada) return { label: 'Renovada', cls: 'badge-blue' }
  if (renovacionMensual) return { label: 'Mensual', cls: 'badge-blue' }
  const d = diasHasta(venc)
  if (d === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (d < 0)     return { label: 'Vencida',   cls: 'badge-danger' }
  if (d <= 30)   return { label: `${d}d`,     cls: 'badge-danger' }
  if (d <= 90)   return { label: `${d}d`,     cls: 'badge-warning' }
  return               { label: formatFecha(venc), cls: 'badge-success' }
}

const FERIADOS_UY = ['01-01','01-06','04-19','05-01','05-18','06-19','07-18','08-25','10-12','11-02','12-25']
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
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthRaw = m - 1 + months
  const targetYear  = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const raw = `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(Math.min(d, maxDay)).padStart(2,'0')}`
  return siguienteDiaHabil(raw)
}

function CuotasFechas({ cuotas, value, onChange }: {
  cuotas: number; value: string[]; onChange: (v: string[]) => void
}) {
  if (cuotas === 0) return (
    <div style={{ padding: '12px', background: 'var(--bg-card-alt)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
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
              style={{ flexShrink: 0, padding: '5px 10px', border: '1.5px solid var(--border-soft)', borderRadius: 7, background: 'var(--bg-card)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
type Poliza   = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null; corredor: string; corredor_nombre?: string | null; corredor_tel?: string | null; moneda: string; cuotas: number; cuota_mes: string; nota: string | null; cliente_id: string; clientes?: { nombre: string }; doc_count?: number; renovada?: boolean; renueva_poliza_id?: string | null; renovacion_mensual?: boolean }
type Documento = { id: string; nombre: string; storage_path: string; tipo: string; tamanio_bytes: number; created_at: string }
type Pago     = { id: string; cuota_num: number; fecha: string; metodo: string }
type ControlMensual = { id: string; poliza_id: string; periodo: string; estado: 'pendiente' | 'controlado' | 'pagado'; fecha_control: string | null; fecha_pago: string | null }
type Paso = 'cliente' | 'poliza'

const MESES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
function formatPeriodo(iso: string) {
  const [y, m] = iso.split('-')
  return `${MESES_LARGOS[parseInt(m) - 1]} ${y}`
}
function primerDiaMes(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}-01`
}
function esRamoMensual(ramo: string): boolean {
  return ramo.trim().toLowerCase() === 'accidentes de trabajo'
}

function sumarUnMes(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const targetMonthRaw = m - 1 + 1
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`
}
// Día 5 del mes siguiente al mes de un vencimiento — es cuando el control mensual
// pasa a Pagado automáticamente.
function fechaCorteControl(vencimiento: string): string {
  const [y, m] = vencimiento.split('-').map(Number)
  const targetMonthRaw = m - 1 + 1
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-05`
}

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

function cuotaFechaISO(item: string): string {
  const parts = item.split('/')
  if (parts.length < 4) return new Date().toISOString().slice(0,10)
  const meses: Record<string,string> = { Ene:'01',Feb:'02',Mar:'03',Abr:'04',May:'05',Jun:'06',Jul:'07',Ago:'08',Sep:'09',Oct:'10',Nov:'11',Dic:'12' }
  const d = parts[1].padStart(2,'0'), m = meses[parts[2]] || '01', y = `20${parts[3]}`
  return `${y}-${m}-${d}`
}

export default function PolizasPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [volverA, setVolverA] = useState<string | null>(null)

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      const from = searchParams.get('from')
      if (from) setVolverA(from)
      supabase.from('polizas').select('*, clientes(nombre, id)').eq('id', openId).single()
        .then(({ data }) => { if (data) abrirDetalle(data); router.replace('/polizas') })
    }
  }, [searchParams])

  const [polizas, setPolizas]         = useState<Poliza[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [dateRange, setDateRange]     = useState<DateRange>({ from: '', to: '' })
  const [page, setPage]               = useState(1)
  const [filtroRamo, setFiltroRamo]   = useState('Todos')
  const [catalogos, setCatalogos]     = useState<{ramos:string[];companias:string[];corredores:string[];monedas:string[]}>({ramos:[],companias:[],corredores:[],monedas:[]})

  // Row menu
  const [editando, setEditando]       = useState<Poliza | null>(null)
  const [editForm, setEditForm]       = useState<Partial<Poliza>>({})
  const [savingEdit, setSavingEdit]         = useState(false)
  const [editCamposRamo, setEditCamposRamo]     = useState<{id:string;nombre:string;tipo:string;opciones:string|null}[]>([])
  const [editValores, setEditValores]           = useState<Record<string,string>>({})
  const [editPagosCount, setEditPagosCount]     = useState(0)
  const [confirmEliminar, setConfirmEliminar]   = useState<Poliza | null>(null)
  const [eliminando, setEliminando]              = useState(false)
  const [editFechasCuotas, setEditFechasCuotas] = useState<string[]>([])

  // Detail view
  const [detalle, setDetalle]         = useState<Poliza | null>(null)
  const [detalleDocs, setDetalleDocs] = useState<Documento[]>([])
  const [detallePagos, setDetallePagos] = useState<Pago[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [showPagoModal, setShowPagoModal]         = useState<number | null>(null)
  const [confirmDeshacerCuota, setConfirmDeshacerCuota] = useState<number | null>(null)
  const [confirmEliminarControl, setConfirmEliminarControl] = useState<ControlMensual | null>(null)
  const [pagoForm, setPagoForm]             = useState({ fecha: new Date().toISOString().slice(0,10), metodo: 'Transferencia', referencia: '' })
  const [savingPago, setSavingPago]         = useState(false)
  const [metodos, setMetodos]               = useState<string[]>([])
  const [tiposDoc, setTiposDoc]               = useState<string[]>([])
  const [docNueva, setDocNueva]               = useState<{ file: File; tipo: string } | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile]           = useState<File | null>(null)
  const [uploadTipoDoc, setUploadTipoDoc]     = useState('')
  const [uploadingDoc, setUploadingDoc]       = useState(false)
  const fileRef                               = useRef<HTMLInputElement>(null)
  const fileRefNueva                          = useRef<HTMLInputElement>(null)

  // New poliza modal
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [saving, setSaving]           = useState(false)
  const [showNuevoCorredor, setShowNuevoCorredor] = useState(false)
  const [nuevoCorredor, setNuevoCorredor]         = useState('')
  const [numeroExiste, setNumeroExiste]           = useState(false)
  const [checkingNumero, setCheckingNumero]       = useState(false)
  const [form, setForm]               = useState({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', corredor_nombre: '', corredor_tel: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: '', tipoAlta: 'nueva' as 'nueva' | 'renovacion', renuevaPolizaId: '', renovacionMensual: false })
  const [controlesMensuales, setControlesMensuales] = useState<ControlMensual[]>([])
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
    await reconciliarControlesMensuales(supabase)
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
    const [r, c, co, m, td] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x:any) => x.nombre),
      companias: (c.data || []).map((x:any) => x.nombre),
      corredores:(co.data || []).map((x:any) => x.nombre),
      monedas:   (m.data || []).map((x:any) => x.nombre),
    })
    const tipos = (td.data || []).map((x:any) => x.nombre)
    setTiposDoc(tipos)
    setUploadTipoDoc(tipos[0] || 'Póliza')
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
    if (p.renovacion_mensual) {
      await refetchControlesMensuales(p.id)
    } else {
      setControlesMensuales([])
    }
    setLoadingDetalle(false)
  }

  // Trae los controles mensuales de una póliza tal cual están en la base, sin
  // recrear nada. Si el usuario borró una fila a propósito (por ejemplo, un
  // período de prueba), tiene que quedar borrada — la creación de períodos
  // nuevos queda a cargo únicamente de reconciliarControlesMensuales (el barrido
  // por fecha) y del alta de la póliza (que crea el primer período).
  async function refetchControlesMensuales(polizaId: string) {
    const { data } = await supabase.from('poliza_controles_mensuales').select('*').eq('poliza_id', polizaId).order('periodo')
    setControlesMensuales((data || []) as ControlMensual[])
  }

  async function marcarControlado(c: ControlMensual) {
    if (!detalle) return
    await supabase.from('poliza_controles_mensuales').update({
      estado: 'controlado', fecha_control: new Date().toISOString().slice(0, 10),
    }).eq('id', c.id)
    await refetchControlesMensuales(detalle.id)
  }

  async function marcarPagado(c: ControlMensual) {
    if (!detalle) return
    const hoy = new Date().toISOString().slice(0, 10)
    await supabase.from('poliza_controles_mensuales').update({ estado: 'pagado', fecha_pago: hoy }).eq('id', c.id)
    const proximoPeriodo = sumarUnMes(c.periodo)
    await supabase.from('polizas').update({ vencimiento: proximoPeriodo }).eq('id', detalle.id)
    const { data: existe } = await supabase.from('poliza_controles_mensuales').select('id')
      .eq('poliza_id', detalle.id).eq('periodo', proximoPeriodo).maybeSingle()
    if (!existe) {
      await supabase.from('poliza_controles_mensuales').insert([{ poliza_id: detalle.id, periodo: proximoPeriodo, estado: 'pendiente' }])
    }
    const detalleActualizado = { ...detalle, vencimiento: proximoPeriodo }
    setDetalle(detalleActualizado)
    await refetchControlesMensuales(detalle.id)
    fetchPolizas()
  }

  async function deshacerControl(c: ControlMensual) {
    if (!detalle) return
    const nuevoEstado = c.estado === 'pagado' ? 'controlado' : 'pendiente'
    await supabase.from('poliza_controles_mensuales').update({
      estado: nuevoEstado,
      ...(nuevoEstado === 'controlado' ? { fecha_pago: null } : { fecha_control: null, fecha_pago: null }),
    }).eq('id', c.id)
    await refetchControlesMensuales(detalle.id)
  }

  async function confirmarEliminarControl() {
    if (!detalle || !confirmEliminarControl) return
    await supabase.from('poliza_controles_mensuales').delete().eq('id', confirmEliminarControl.id)
    setConfirmEliminarControl(null)
    await refetchControlesMensuales(detalle.id)
  }

  async function subirDocDetalle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    e.target.value = ''
  }

  async function confirmarSubidaDetalle() {
    if (!uploadFile || !detalle) return
    setUploadingDoc(true)
    setShowUploadModal(false)
    const path = `${detalle.cliente_id}/${detalle.id}/${Date.now()}_${uploadFile.name}`
    await supabase.storage.from('documentos').upload(path, uploadFile)
    await supabase.from('documentos').insert([{
      cliente_id: detalle.cliente_id, poliza_id: detalle.id,
      nombre: uploadFile.name, tipo: uploadTipoDoc,
      storage_path: path, tamanio_bytes: uploadFile.size,
    }])
    setUploadingDoc(false)
    setUploadFile(null)
    await abrirDetalle(detalle)
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
    await supabase.from('pagos').delete().eq('poliza_id', detalle.id).eq('cuota_num', cuotaNum)
    await abrirDetalle(detalle)
    fetchPolizas()
  }

  async function confirmarEliminarPoliza() {
    if (!confirmEliminar) return
    const p = confirmEliminar
    setEliminando(true)
    // Borrar documentos del storage primero
    const { data: docs } = await supabase.from('documentos').select('storage_path').eq('poliza_id', p.id)
    if (docs && docs.length > 0) {
      await supabase.storage.from('documentos').remove(docs.map(d => d.storage_path))
    }
    // Borrar registros relacionados antes de la póliza
    await supabase.from('pagos').delete().eq('poliza_id', p.id)
    await supabase.from('documentos').delete().eq('poliza_id', p.id)
    await supabase.from('poliza_campos').delete().eq('poliza_id', p.id)
    await supabase.from('siniestros').delete().eq('poliza_id', p.id)
    const { error } = await supabase.from('polizas').delete().eq('id', p.id)
    setEliminando(false)
    if (error) {
      console.error('Error eliminando póliza:', error)
      alert(`No se pudo eliminar: ${error.message}`)
      return
    }
    setConfirmEliminar(null)
    if (detalle?.id === p.id) setDetalle(null)
    await registrarAudit({
      accion: 'eliminar', tabla: 'polizas', registroId: p.id,
      descripcion: `Póliza eliminada: ${p.ramo} ${p.numero} — ${p.clientes?.nombre || ''}`,
      datosAntes: p,
    })
    await fetchPolizas()
  }

  async function guardarEdicion() {
    if (!editando) return
    setSavingEdit(true)
    const nCuotas = Number(editForm.cuotas) || editando.cuotas || 0
    const nuevasCuotaMes = editFechasCuotas.slice(0, nCuotas).map((f, i) => {
      if (!f) return `${i+1}/?`
      const [y,m,d] = f.split('-')
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
    }).join(' - ')
    await supabase.from('polizas').update({
      numero:      editForm.numero,
      ramo:        editForm.ramo,
      compania:    editForm.compania,
      corredor:    editForm.corredor,
      corredor_nombre: editForm.corredor === 'Otro' ? (editForm as any).corredor_nombre || null : null,
      corredor_tel:    editForm.corredor === 'Otro' ? (editForm as any).corredor_tel    || null : null,
      moneda:      editForm.moneda,
      vencimiento: editForm.vencimiento || null,
      nota:        editForm.nota || null,
      cuotas:      nCuotas,
      cuota_mes:   nuevasCuotaMes,
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
    await registrarAudit({
      accion: 'editar', tabla: 'polizas', registroId: editando.id,
      descripcion: `Póliza editada: ${editForm.ramo} ${editForm.numero}`,
      datosDespues: editForm,
    })
    await fetchPolizas()
  }

  async function checkNumeroExiste(numero: string) {
    if (!numero.trim()) { setNumeroExiste(false); return }
    setCheckingNumero(true)
    const { data } = await supabase.from('polizas').select('id').eq('numero', numero.trim()).maybeSingle()
    setNumeroExiste(!!data)
    setCheckingNumero(false)
  }

  async function crearCorredor() {
    if (!nuevoCorredor.trim()) return
    await supabase.from('corredores').insert([{ nombre: nuevoCorredor.trim() }])
    const { data } = await supabase.from('corredores').select('nombre').order('nombre')
    setCatalogos(p => ({ ...p, corredores: (data || []).map((x: any) => x.nombre) }))
    setForm(f => ({ ...f, corredor: nuevoCorredor.trim() }))
    setShowNuevoCorredor(false)
    setNuevoCorredor('')
  }

  async function guardarPoliza() {
    if (!clienteSeleccionado || !form.numero.trim()) return
    if (numeroExiste) return
    if (form.tipoAlta === 'renovacion' && !form.renuevaPolizaId) { alert('Seleccioná qué póliza estás renovando'); return }
    let nCuotas = 0
    if (!form.renovacionMensual) {
      nCuotas = parseInt(form.cuotas) || 0
      if (nCuotas < 1) { alert('Ingresá al menos 1 cuota'); return }
      if (!form.fechasCuotas[0]) { alert('Ingresá la fecha de la primera cuota'); return }
    }
    if (!form.vencimiento) { alert('Ingresá la fecha de vencimiento'); return }
    setSaving(true)
    const { data: polData } = await supabase.from('polizas').insert([{
      cliente_id:  clienteSeleccionado.id,
      ramo: form.ramo, compania: form.compania, numero: form.numero,
      vencimiento: form.vencimiento, corredor: form.corredor,
      corredor_nombre: form.corredor === 'Otro' ? form.corredor_nombre : null,
      corredor_tel:    form.corredor === 'Otro' ? form.corredor_tel    : null,
      moneda: form.moneda, cuotas: nCuotas,
      cuota_mes: form.renovacionMensual ? '' : fechasACuotaMes(form.fechasCuotas), nota: form.nota || null,
      renueva_poliza_id: form.tipoAlta === 'renovacion' ? form.renuevaPolizaId : null,
      renovacion_mensual: form.renovacionMensual,
    }]).select().single()
    if (polData) {
      const polizaId = (polData as any).id
      if (form.renovacionMensual) {
        await supabase.from('poliza_controles_mensuales').insert([{
          poliza_id: polizaId, periodo: primerDiaMes(form.vencimiento), estado: 'pendiente',
        }])
      }
      const inserts = Object.entries(valoresCampos)
        .filter(([_, v]) => v.trim())
        .map(([campoId, valor]) => ({ poliza_id: polizaId, campo_id: campoId, valor }))
      if (inserts.length > 0) await supabase.from('poliza_campos').insert(inserts)
      // Subir documento si se adjuntó
      if (docNueva) {
        const path = `${clienteSeleccionado.id}/${polizaId}/${Date.now()}_${docNueva.file.name}`
        await supabase.storage.from('documentos').upload(path, docNueva.file)
        await supabase.from('documentos').insert([{
          cliente_id: clienteSeleccionado.id, poliza_id: polizaId,
          nombre: docNueva.file.name, tipo: docNueva.tipo,
          storage_path: path, tamanio_bytes: docNueva.file.size,
        }])
        setDocNueva(null)
      }
      await registrarAudit({
        accion: 'crear', tabla: 'polizas', registroId: polizaId,
        descripcion: `Póliza creada: ${form.ramo} ${form.numero} — ${clienteSeleccionado.nombre}`,
        datosDespues: polData,
      })
      // Si es una renovación, marcar la póliza anterior como renovada
      if (form.tipoAlta === 'renovacion' && form.renuevaPolizaId) {
        const anterior = polizas.find(p => p.id === form.renuevaPolizaId)
        await supabase.from('polizas').update({ renovada: true }).eq('id', form.renuevaPolizaId)
        await registrarAudit({
          accion: 'editar', tabla: 'polizas', registroId: form.renuevaPolizaId,
          descripcion: `Póliza marcada como renovada por la nueva póliza ${form.ramo} ${form.numero}${anterior ? ` (era ${anterior.ramo} ${anterior.numero})` : ''}`,
          datosDespues: { renovada: true },
        })
      }
    }
    cerrarModal()
    setSaving(false)
    await fetchPolizas()
  }

  async function seleccionarPolizaARenovar(polizaId: string) {
    if (!polizaId) { setForm(f => ({ ...f, renuevaPolizaId: '' })); return }
    const anterior = polizas.find(p => p.id === polizaId)
    setForm(f => ({
      ...f,
      renuevaPolizaId: polizaId,
      ramo: anterior?.ramo || f.ramo,
      compania: anterior?.compania || f.compania,
      corredor: anterior?.corredor || f.corredor,
      corredor_nombre: anterior?.corredor_nombre || '',
      corredor_tel: anterior?.corredor_tel || '',
      moneda: anterior?.moneda || f.moneda,
      cuotas: anterior ? String(anterior.cuotas || '') : f.cuotas,
      nota: anterior?.nota || '',
      renovacionMensual: anterior?.renovacion_mensual || false,
    }))
    setValoresCampos({})
    setCamposRamo([])
    if (anterior?.ramo) {
      const { data: ramoData } = await supabase.from('ramos').select('id').eq('nombre', anterior.ramo).single()
      if (ramoData) {
        const { data: campos } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramoData.id).order('orden')
        setCamposRamo(campos || [])
      }
    }
    if (anterior) {
      const { data: vals } = await supabase.from('poliza_campos').select('campo_id, valor').eq('poliza_id', anterior.id)
      const map: Record<string, string> = {}
      ;(vals || []).forEach((v: any) => { map[v.campo_id] = v.valor })
      setValoresCampos(map)
    }
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSeleccionado(null)
    setForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', corredor_nombre: '', corredor_tel: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '', tipoAlta: 'nueva', renuevaPolizaId: '', renovacionMensual: false })
    setCamposRamo([])
    setValoresCampos({})
    setShowModal(true)
  }
  function cerrarModal() { setShowModal(false); setClienteSeleccionado(null); setPaso('cliente'); setNumeroExiste(false) }

  function renovarPoliza() {
    if (!detalle) return
    setClienteSeleccionado({ id: detalle.cliente_id, nombre: detalle.clientes?.nombre || '', direccion: '' })
    setForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', corredor_nombre: '', corredor_tel: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '', tipoAlta: 'renovacion', renuevaPolizaId: '', renovacionMensual: false })
    setCamposRamo([])
    setValoresCampos({})
    setPaso('poliza')
    setShowModal(true)
    seleccionarPolizaARenovar(detalle.id)
  }

  const RAMOS_FILTRO = ['Todos', ...catalogos.ramos]
  const polizasEnriched = polizas.map(p => ({ ...p, cliente_nombre: p.clientes?.nombre || '' }))
  const filtradasBase = polizasEnriched.filter(p => {
    const q = search.toLowerCase()
    const nombre = p.clientes?.nombre || ''
    const pasaTexto = !q || nombre.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q) || p.ramo.toLowerCase().includes(q)
    const pasaRamo = filtroRamo === 'Todos' || p.ramo === filtroRamo
    const pasaFecha = (!dateRange.from && !dateRange.to) ||
      (p.vencimiento && (!dateRange.from || p.vencimiento >= dateRange.from) && (!dateRange.to || p.vencimiento <= dateRange.to))
    return pasaTexto && pasaRamo && pasaFecha
  })
  const { sort: sortState, toggleSort, sorted: filtradas } = useSortFilter<any>(filtradasBase)
  const paginadas = paginate(filtradas, page)
  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  // Modal de nueva póliza / renovación — se define acá (fuera de las dos vistas)
  // para poder usarse tanto desde la vista de lista como desde el detalle
  // (el botón "Renovar póliza" del detalle abre este mismo modal).
  const nuevaPolizaModal = showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : form.tipoAlta === 'renovacion' ? 'Renovar póliza' : 'Nueva póliza'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : '2'} de 2
                </div>
                {paso === 'poliza' && clienteSeleccionado && (
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)', marginTop: 6, lineHeight: 1.2 }}>
                    {clienteSeleccionado.nombre}
                  </div>
                )}
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
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
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSeleccionado(c); setPaso('poliza') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.direccion}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {paso === 'poliza' && (
              <>
                <div className="fgroup">
                  <label>Tipo *</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ val: 'nueva' as const, label: 'Nueva póliza' }, { val: 'renovacion' as const, label: 'Renovación' }].map(({ val, label }) => (
                      <button key={val} type="button"
                        onClick={() => setForm(f => ({ ...f, tipoAlta: val, renuevaPolizaId: val === 'nueva' ? '' : f.renuevaPolizaId }))}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: `2px solid ${form.tipoAlta === val ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 9, background: form.tipoAlta === val ? 'var(--gold-pale)' : 'var(--bg-card)', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: form.tipoAlta === val ? 'var(--navy)' : 'var(--text-muted)', transition: 'all .15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {form.tipoAlta === 'renovacion' && (
                  <div className="fgroup">
                    <label>Póliza que renueva *</label>
                    <select value={form.renuevaPolizaId} onChange={e => seleccionarPolizaARenovar(e.target.value)}
                      style={{ color: form.renuevaPolizaId ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {polizas.filter(p => p.cliente_id === clienteSeleccionado?.id && !p.renovada).map(p => (
                        <option key={p.id} value={p.id}>{p.ramo} {p.numero} — vence {formatFecha(p.vencimiento)}</option>
                      ))}
                    </select>
                    {clienteSeleccionado && polizas.filter(p => p.cliente_id === clienteSeleccionado.id && !p.renovada).length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Este cliente no tiene otras pólizas activas para renovar</div>
                    )}
                  </div>
                )}
                {esRamoMensual(form.ramo) && (
                  <div className="fgroup">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>
                      <input type="checkbox" checked={form.renovacionMensual} readOnly
                        style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
                      Se renueva sola cada mes (Accidentes de trabajo — BPS)
                    </label>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                      No se cargan cuotas fijas: cada mes vas a poder marcar la póliza como Controlada (factura recibida y enviada a pagar). Se marca Pagada sola el día 5 del mes siguiente al vencimiento.
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <div className="fgroup">
                    <label>Ramo *</label>
                    <select value={form.ramo} onChange={async e => {
                      const nuevoRamo = e.target.value
                      setForm(f => ({
                        ...f, ramo: nuevoRamo,
                        renovacionMensual: esRamoMensual(nuevoRamo) ? true : (esRamoMensual(f.ramo) ? false : f.renovacionMensual),
                        cuotas: esRamoMensual(nuevoRamo) ? '' : f.cuotas,
                        fechasCuotas: esRamoMensual(nuevoRamo) ? [] : f.fechasCuotas,
                        compania: esRamoMensual(nuevoRamo) ? 'BSE' : (esRamoMensual(f.ramo) ? '' : f.compania),
                        moneda: esRamoMensual(nuevoRamo) ? '$' : (esRamoMensual(f.ramo) ? '' : f.moneda),
                      }))
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
                    <input value={form.numero}
  onChange={e => { setForm({ ...form, numero: e.target.value }); checkNumeroExiste(e.target.value) }}
  placeholder="Ej: 4309338"
  style={{ borderColor: numeroExiste ? 'var(--danger)' : undefined }} />
{checkingNumero && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Verificando...</div>}
{numeroExiste && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontWeight: 600 }}>⚠ Esta póliza ya existe en el sistema</div>}
                  </div>
                  <div className="fgroup">
                    <label>Compañía *</label>
                    {esRamoMensual(form.ramo) ? (
                      <>
                        <input value="BSE" disabled
                          style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Accidentes de trabajo es exclusivo de BSE por ley</div>
                      </>
                    ) : (
                      <select value={form.compania} onChange={e => setForm({ ...form, compania: e.target.value })} style={{ color: form.compania ? 'var(--navy)' : 'var(--slate)' }}>
                        <option value="">— Seleccionar —</option>
                        {catalogos.companias.map((c:string) => <option key={c}>{c}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="fgroup">
                    <label>Corredor *</label>
                    {showNuevoCorredor ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input value={nuevoCorredor} onChange={e => setNuevoCorredor(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && crearCorredor()}
                          placeholder="Nombre del corredor" autoFocus
                          style={{ flex: 1, padding: '10px 13px', border: '1.5px solid var(--gold)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                        <button className="btn-primary btn-sm" onClick={crearCorredor} style={{ padding: '8px 12px' }}>✓</button>
                        <button className="btn-outline btn-sm" onClick={() => { setShowNuevoCorredor(false); setNuevoCorredor('') }} style={{ padding: '8px 12px' }}>×</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select value={form.corredor} onChange={e => setForm({ ...form, corredor: e.target.value, corredor_nombre: '', corredor_tel: '' })}
                          style={{ flex: 1, color: form.corredor ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          <option value="">— Seleccionar —</option>
                          {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                          <option value="Otro">Otro (ingresar manualmente)</option>
                        </select>
                        <button className="btn-outline btn-sm" onClick={() => setShowNuevoCorredor(true)}
                          title="Agregar a la lista" style={{ padding: '8px 12px', fontSize: 16, flexShrink: 0 }}>+</button>
                      </div>
                    )}
                    {form.corredor === 'Otro' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input value={form.corredor_nombre} onChange={e => setForm(f => ({ ...f, corredor_nombre: e.target.value }))}
                          placeholder="Nombre del corredor"
                          style={{ flex: 2, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)' }} />
                        <input value={form.corredor_tel} onChange={e => setForm(f => ({ ...f, corredor_tel: e.target.value }))}
                          placeholder="Teléfono"
                          style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)' }} />
                      </div>
                    )}
                  </div>
                  <div className="fgroup">
                    <label>Vencimiento *</label>
                    <DatePicker value={form.vencimiento} onChange={v => setForm({ ...form, vencimiento: v })} placeholder="Seleccionar fecha" />
                  </div>
                  <div className="fgroup">
                    <label>Moneda *</label>
                    {esRamoMensual(form.ramo) ? (
                      <input value="$" disabled style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                    ) : (
                      <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })} style={{ color: form.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                        <option value="">— Seleccionar —</option>
                        {(catalogos.monedas || []).map((m:string) => <option key={m}>{m}</option>)}
                      </select>
                    )}
                  </div>
                  {!form.renovacionMensual && (
                    <>
                      <div className="fgroup">
                        <label>Cantidad de cuotas *</label>
                        <input type="number" min="1" max="36" value={form.cuotas} onChange={e => setForm({ ...form, cuotas: e.target.value, fechasCuotas: [] })} placeholder="Ej: 10" />
                      </div>
                      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                        <label>Fechas de vencimiento por cuota *<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— ingresá la cantidad de cuotas primero</span></label>
                        <CuotasFechas cuotas={parseInt(form.cuotas) || 0} value={form.fechasCuotas} onChange={v => setForm({ ...form, fechasCuotas: v })} />
                      </div>
                    </>
                  )}
                  {camposRamo.length > 0 && (
                    <div style={{ gridColumn: 'span 2', background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
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
                              value={(valoresCampos[campo.id] || '').split('|')[1] || form.moneda || 'U$S'}
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
                                const moneda = (valoresCampos[campo.id] || '').split('|')[1] || form.moneda || 'U$S'
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
                    <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opcional)</span></label>
                    <textarea value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} placeholder="Descripción del bien asegurado" rows={2}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)', lineHeight: 1.5 }}
                      onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                  </div>
                </div>
                {/* Adjuntar documento opcional */}
                <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 14, marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Documento adjunto <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                  </div>
                  <input type="file" id="adj-doc-input-polizas" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setDocNueva({ file: f, tipo: tiposDoc[0] || 'Póliza' }); e.target.value = '' }} />
                  {docNueva ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📎 {docNueva.file.name}
                      </div>
                      <select value={docNueva.tipo} onChange={e => setDocNueva((d: any) => d ? { ...d, tipo: e.target.value } : null)}
                        style={{ padding: '5px 8px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)' }}>
                        {tiposDoc.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <button onClick={() => setDocNueva(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, padding: '0 4px' }}>×</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => (document.getElementById('adj-doc-input-polizas') as HTMLInputElement)?.click()}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                      onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-alt)' }}
                      onDrop={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-alt)'; const file = e.dataTransfer.files?.[0]; if (file) setDocNueva({ file, tipo: tiposDoc[0] || 'Póliza' }) }}
                      style={{ border: '2px dashed var(--border)', borderRadius: 9, padding: '14px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card-alt)', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}
                    >
                      <Upload size={14} /> Adjuntar documento o arrastrar acá
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={guardarPoliza} disabled={saving || !form.numero.trim() || (form.tipoAlta === 'renovacion' && !form.renuevaPolizaId)}>
                      {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar póliza'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
  )

  // ── DETALLE VIEW ──────────────────────────────────────────────────────────
  if (detalle) {
    const { label, cls } = estadoBadge(detalle.vencimiento, detalle.renovada, detalle.renovacion_mensual)
    const pagosMap: Record<number, Pago> = {}
    detallePagos.forEach(pg => { pagosMap[pg.cuota_num] = pg })
    const pct = detalle.cuotas > 0 ? Math.round(detallePagos.length / detalle.cuotas * 100) : 0

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Pólizas</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{detalle.ramo} · {detalle.numero}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => { if (volverA) { router.push(`/${volverA}`) } else { setDetalle(null) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
            <ArrowLeft size={14} /> {volverA === 'vencimientos' ? 'Volver a vencimientos' : 'Volver a pólizas'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!detalle.renovada && (
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseDown={e => { e.stopPropagation() }}
                onClick={e => { e.stopPropagation(); renovarPoliza() }}>
                <RotateCw size={14} /> Renovar póliza
              </button>
            )}
            <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseDown={e => { e.stopPropagation() }}
              onClick={e => {
                e.stopPropagation()
                setEditando(detalle)
                setEditForm({ numero: detalle.numero, ramo: detalle.ramo, compania: detalle.compania, corredor: detalle.corredor, corredor_nombre: detalle.corredor_nombre || '', corredor_tel: detalle.corredor_tel || '', moneda: detalle.moneda, vencimiento: detalle.vencimiento, nota: detalle.nota, cuotas: detalle.cuotas } as any)
                setEditPagosCount(detallePagos.length)
                setEditFechasCuotas(parseFechasCuotaMes(detalle.cuota_mes || ''))
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
        </div>

        {/* Header card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="badge badge-neutral" style={{ fontSize: 13 }}>{detalle.ramo}</span>
                <span className={`badge ${cls}`}>{label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{detalle.numero}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginTop: 6 }}>{detalle.clientes?.nombre}</div>
              {detalle.nota && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-main)', background: 'var(--bg-card-alt)', borderLeft: '3px solid var(--gold)', padding: '6px 12px', borderRadius: 6 }}>
                  {detalle.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </div>
              )}
              {detalle.renueva_poliza_id && (() => {
                const anterior = polizas.find(p => p.id === detalle.renueva_poliza_id)
                return anterior ? (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Renueva la póliza <strong style={{ color: 'var(--text-main)' }}>{anterior.ramo} {anterior.numero}</strong>
                  </div>
                ) : null
              })()}
              {detalle.renovada && (() => {
                const nueva = polizas.find(p => p.renueva_poliza_id === detalle.id)
                return nueva ? (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Renovada por <strong style={{ color: 'var(--text-main)' }}>{nueva.ramo} {nueva.numero}</strong>
                  </div>
                ) : null
              })()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Compañía',    value: detalle.compania },
                { label: 'Corredor',    value: detalle.corredor === 'Otro' && detalle.corredor_nombre ? `${detalle.corredor_nombre}${detalle.corredor_tel ? ' · ' + detalle.corredor_tel : ''}` : detalle.corredor },
                { label: 'Moneda',      value: detalle.moneda },
                { label: detalle.renovacion_mensual ? 'Próximo control' : 'Vencimiento', value: formatFecha(detalle.vencimiento) },
                ...(detalle.renovacion_mensual ? [] : [
                  { label: 'Cuotas',  value: detalle.cuotas || '—' },
                  { label: 'Pagadas', value: `${detallePagos.length}/${detalle.cuotas}` },
                ]),
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campos extra por ramo */}
        {detalleExtras.length > 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '16px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Datos específicos — {detalle.ramo}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {detalleExtras.map(e => (
                <div key={e.nombre}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{e.nombre}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{formatValor(e.valor)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control mensual — pólizas de renovación automática (ej. Accidentes de trabajo) */}
        {detalle.renovacion_mensual && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Control mensual <span style={{ fontWeight: 400 }}>— se renueva sola cada mes</span>
            </div>
            {loadingDetalle ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</div>
            ) : controlesMensuales.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin períodos registrados. Se va a crear uno nuevo automáticamente cuando corresponda.</div>
            ) : controlesMensuales.map(c => {
              const estiloEstado = c.estado === 'pagado'
                ? { rowClass: 'paid', numClass: 'paid', tagStyle: undefined, tagLabel: 'Pagada' }
                : c.estado === 'controlado'
                ? { rowClass: '', numClass: '', tagStyle: { background: '#DBEAFE', color: '#1E40AF' }, tagLabel: 'Controlada' }
                : { rowClass: '', numClass: 'pending', tagStyle: undefined, tagLabel: 'Pendiente' }
              return (
                <div key={c.id} className={`cuota-row ${estiloEstado.rowClass}`}
                  style={c.estado === 'controlado' ? { background: '#EFF6FF', borderColor: '#BFDBFE' } : undefined}>
                  <div className={`cuota-num ${estiloEstado.numClass}`}
                    style={c.estado === 'controlado' ? { background: '#DBEAFE', color: '#1E40AF' } : undefined}>
                    {formatPeriodo(c.periodo).slice(0, 3)}
                  </div>
                  <div className="cuota-info">
                    <div className="cuota-title">{formatPeriodo(c.periodo)}</div>
                    <div className="cuota-sub">
                      {c.estado === 'pagado' ? `Pagada ${formatFecha(c.fecha_pago)}`
                        : c.estado === 'controlado' ? `Controlada ${formatFecha(c.fecha_control)} — se marca pagada sola el ${formatFecha(fechaCorteControl(c.periodo))}`
                        : 'Pendiente — falta verificar que llegó la factura'}
                    </div>
                  </div>
                  {c.estado === 'pendiente' && (
                    <button className="btn-primary btn-sm" onClick={() => marcarControlado(c)}>Marcar controlado</button>
                  )}
                  {c.estado === 'controlado' && (
                    <>
                      <span className="cuota-paid-tag" style={estiloEstado.tagStyle}>{estiloEstado.tagLabel}</span>
                      <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6 }} onClick={() => deshacerControl(c)}>Deshacer</button>
                    </>
                  )}
                  {c.estado === 'pagado' && (
                    <>
                      <span className="cuota-paid-tag">{estiloEstado.tagLabel}</span>
                      <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6 }} onClick={() => deshacerControl(c)}>Deshacer</button>
                    </>
                  )}
                  <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6, color: 'var(--danger)', borderColor: '#FEE2E2' }}
                    title="Eliminar período" onClick={() => setConfirmEliminarControl(c)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Cuotas */}
        {!detalle.renovacion_mensual && detalle.cuotas > 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>
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
              const hoy = new Date(); hoy.setHours(0,0,0,0)
              const esControlado = pago?.fecha && (() => { const [py,pm,pd] = pago.fecha.split('-').map(Number); return new Date(py,pm-1,pd) > hoy })()
              return (
                <div key={n} className={`cuota-row ${pago ? 'paid' : ''}`}
                  style={esControlado ? { background: '#EFF6FF', borderColor: '#BFDBFE' } : undefined}>
                  <div className={`cuota-num ${pago ? 'paid' : 'pending'}`}
                    style={esControlado ? { background: '#DBEAFE', color: '#1E40AF' } : undefined}>{n}</div>
                  <div className="cuota-info">
                    <div className="cuota-title">Cuota {n} — {fechaStr}</div>
                    <div className="cuota-sub">{pago ? `${esControlado ? 'Controlado' : 'Pagado'} ${pago.fecha} · ${pago.metodo}` : 'Pendiente'}</div>
                  </div>
                  {pago ? (
                    <>
                      <span className="cuota-paid-tag"
                        style={esControlado ? { background: '#DBEAFE', color: '#1E40AF' } : undefined}>
                        {esControlado ? 'Controlado' : 'Pagada'}
                      </span>
                      <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6 }}
                        onClick={() => setConfirmDeshacerCuota(n)}>Deshacer</button>
                    </>
                  ) : (
                    <button className="btn-primary btn-sm"
                      onClick={() => { setPagoForm({ fecha: cuotaFechaISO(item), metodo: metodos[0] || 'Transferencia', referencia: '' }); setShowPagoModal(n) }}>
                      + Registrar pago
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Documentos */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Documentos {detalleDocs.length > 0 && `(${detalleDocs.length})`}
            </div>
            <button className="btn-outline btn-sm" onClick={() => { setUploadFile(null); setShowUploadModal(true) }} disabled={uploadingDoc}>
              <Upload size={13} /> {uploadingDoc ? 'Subiendo...' : 'Subir doc'}
            </button>
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={subirDocDetalle} />
          {loadingDetalle ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
          ) : detalleDocs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin documentos adjuntos</div>
          ) : detalleDocs.map(doc => {
            const ext = extStyle[getExt(doc.nombre)] || extStyle.pdf
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5FB' }}>
                <div style={{ width: 34, height: 34, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{doc.tipo} · {formatBytes(doc.tamanio_bytes)}</div>
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
          <div className="pago-modal" style={{ width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
            {/* Sticky header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Editar póliza</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
            </div>
            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
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
                <select value={editForm.corredor || ''} onChange={e => setEditForm(p => ({...p, corredor: e.target.value, corredor_nombre: '', corredor_tel: ''}))}>
                  {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                  <option value="Otro">Otro (ingresar manualmente)</option>
                </select>
                {editForm.corredor === 'Otro' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input value={(editForm as any).corredor_nombre || ''} onChange={e => setEditForm((p: any) => ({ ...p, corredor_nombre: e.target.value }))}
                      placeholder="Nombre del corredor"
                      style={{ flex: 2, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)' }} />
                    <input value={(editForm as any).corredor_tel || ''} onChange={e => setEditForm((p: any) => ({ ...p, corredor_tel: e.target.value }))}
                      placeholder="Teléfono"
                      style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)' }} />
                  </div>
                )}
              </div>
              <div className="fgroup"><label>Vencimiento</label>
                <DatePicker value={editForm.vencimiento || ''} onChange={v => setEditForm(p => ({...p, vencimiento: v}))} /></div>
              <div className="fgroup"><label>Moneda</label>
                <select value={editForm.moneda || ''} onChange={e => setEditForm(p => ({...p, moneda: e.target.value}))}>
                  {catalogos.monedas.map((m:string) => <option key={m}>{m}</option>)}
                </select></div>
              <div className="fgroup">
                <label>Cantidad de cuotas</label>
                <input type="number" value={editForm.cuotas || ''} min={editPagosCount} max={36}
                  onChange={e => {
                    const n = parseInt(e.target.value) || 0
                    if (n < editPagosCount) return
                    setEditForm(p => ({...p, cuotas: n}))
                    if (n > editFechasCuotas.length) {
                      const base = editFechasCuotas[0] || ''
                      setEditFechasCuotas(Array.from({ length: n }, (_, i) => editFechasCuotas[i] || (base ? addMonthsAndDays(base, i) : '')))
                    } else {
                      setEditFechasCuotas(prev => prev.slice(0, n))
                    }
                  }} />
                {editPagosCount > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Mínimo {editPagosCount} ({editPagosCount} ya pagada{editPagosCount > 1 ? 's' : ''})
                  </div>
                )}
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nota (opcional)</label>
                <textarea value={editForm.nota || ''} onChange={e => setEditForm(p => ({...p, nota: e.target.value}))} rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>
            {editCamposRamo.length > 0 && (
              <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px', marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Datos específicos — {editForm.ramo}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  {editCamposRamo.map((campo: any) => (
                    <div key={campo.id} className="fgroup">
                      <label>{campo.nombre}</label>
                      {campo.tipo === 'numero_moneda' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <select value={(editValores[campo.id] || '').split('|')[1] || editForm.moneda || 'U$S'}
                            onChange={e => { const m = (editValores[campo.id] || '').split('|')[0] || ''; setEditValores(p => ({...p, [campo.id]: `${m}|${e.target.value}`})) }}
                            style={{ flex: 1, minWidth: 70 }}><option>U$S</option><option>$</option><option>€</option></select>
                          <input type="number" value={(editValores[campo.id] || '').split('|')[0] || ''}
                            onChange={e => { const mon = (editValores[campo.id] || '').split('|')[1] || editForm.moneda || 'U$S'; setEditValores(p => ({...p, [campo.id]: `${e.target.value}|${mon}`})) }}
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
            {editFechasCuotas.length > 0 && (
              <div className="fgroup" style={{ marginTop: 8 }}>
                <label>Fechas de vencimiento por cuota</label>
                <CuotasFechas cuotas={Number(editForm.cuotas) || editFechasCuotas.length} value={editFechasCuotas} onChange={setEditFechasCuotas} />
              </div>
            )}
            </div>
            {/* Sticky footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)', borderRadius: '0 0 14px 14px' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={savingEdit}>
                {savingEdit ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal subir doc */}
      {showUploadModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowUploadModal(false); setUploadFile(null) } }}>
          <div className="pago-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Subir documento</h3>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {uploadFile ? (
              <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Paperclip size={16} color="var(--gold)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFile.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{(uploadFile.size / 1024).toFixed(0)} KB</div>
                </div>
                <button onClick={() => setUploadFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16 }}>×</button>
              </div>
            ) : (
              <>
                <input type="file" id="upload-doc-input-poliza" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); e.target.value = '' }} />
                <div
                  onClick={() => (document.getElementById('upload-doc-input-poliza') as HTMLInputElement)?.click()}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                  onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-alt)' }}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-alt)'; const file = e.dataTransfer.files?.[0]; if (file) setUploadFile(file) }}
                  style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card-alt)', marginBottom: 16, transition: 'all .15s' }}
                >
                  <Upload size={26} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--text-muted)' }} />
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>Seleccionar archivo</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Hacé click o arrastrá el documento acá</div>
                </div>
              </>
            )}
            <div className="fgroup">
              <label>Tipo de documento</label>
              <select value={uploadTipoDoc} onChange={e => setUploadTipoDoc(e.target.value)}>
                {tiposDoc.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => { setShowUploadModal(false); setUploadFile(null) }}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarSubidaDetalle} disabled={!uploadFile}>
                <Upload size={14} /> Subir archivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar deshacer pago */}
      {confirmDeshacerCuota !== null && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setConfirmDeshacerCuota(null) }}>
          <div className="pago-modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94F4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Deshacer este pago?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                Se eliminará el registro de pago de la <strong>Cuota {confirmDeshacerCuota}</strong>. La cuota volverá a quedar pendiente.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDeshacerCuota(null)}>Cancelar</button>
              <button style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => { deshacerPago(confirmDeshacerCuota!); setConfirmDeshacerCuota(null) }}>
                Deshacer pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar período de control mensual */}
      {confirmEliminarControl && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setConfirmEliminarControl(null) }}>
          <div className="pago-modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Trash2 size={20} color="#D94F4F" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar este período?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                Se va a eliminar el período <strong style={{ color: 'var(--text-main)' }}>{formatPeriodo(confirmEliminarControl.periodo)}</strong> del control mensual. Esta acción no se puede deshacer.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminarControl(null)}>Cancelar</button>
              <button style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarControl}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      {showPagoModal !== null && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPagoModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar pago</h3>
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {detalle?.ramo} · {detalle?.numero} · Cuota {showPagoModal}
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

      {nuevaPolizaModal}
    </div>
  )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Pólizas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{loading ? 'Cargando...' : `${polizas.length} pólizas en cartera`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExportButton
            titulo="Cartera de pólizas"
            subtitulo={`${filtradas.length} pólizas`}
            columnas={[
              { header: 'N° Póliza', key: 'numero', width: 80 },
              { header: 'Cliente', key: 'cliente', width: 140 },
              { header: 'Ramo', key: 'ramo', width: 80 },
              { header: 'Compañía', key: 'compania', width: 80 },
              { header: 'Corredor', key: 'corredor', width: 90 },
              { header: 'Vencimiento', key: 'vencimiento', width: 80 },
              { header: 'Moneda', key: 'moneda', width: 50 },
              { header: 'Estado', key: 'estado', width: 70 },
            ]}
            filas={filtradas.map(p => ({
              numero: p.numero,
              cliente: p.clientes?.nombre || '',
              ramo: p.ramo,
              compania: p.compania,
              corredor: p.corredor,
              vencimiento: formatFecha(p.vencimiento),
              moneda: p.moneda,
              estado: estadoBadge(p.vencimiento, p.renovada, p.renovacion_mensual).label,
            }))}
            filename="cartera-polizas-fascioli"
          />
          <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nueva póliza</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <DateRangeFilter value={dateRange} onChange={v => { setDateRange(v); setPage(1) }} label="Vencimiento" />
        <select value={filtroRamo} onChange={e => { setFiltroRamo(e.target.value); setPage(1) }}
          style={{ padding: '9px 14px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', minWidth: 170 }}>
          {RAMOS_FILTRO.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Todos los ramos' : t}</option>)}
        </select>
      </div>

      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} />
            <col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 80 }} /><col style={{ width: 130 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label="N° Póliza" col="numero" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Cliente" col="cliente_nombre" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Ramo" col="ramo" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Compañía" col="compania" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Vencimiento" col="vencimiento" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Moneda" col="moneda" sort={sortState} onSort={toggleSort} />
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pólizas</div>
              </td></tr>
            ) : paginadas.map(p => {
              const { label, cls } = estadoBadge(p.vencimiento, p.renovada, p.renovacion_mensual)
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => { setVolverA(null); abrirDetalle(p) }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{p.numero}</td>
                  <td style={{ fontWeight: 600 }}>{p.clientes?.nombre || '—'}</td>
                  <td><span className="badge badge-neutral">{p.ramo}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.compania}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatFecha(p.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{p.moneda}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${cls}`}>{label}</span>
                      {(p.doc_count ?? 0) > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 11 }}>
                          <Paperclip size={11} />{p.doc_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-outline btn-sm"
                      style={{ color: 'var(--danger)', borderColor: '#FEE2E2', fontSize: 12 }}
                      onClick={() => setConfirmEliminar(p)}>
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mobile-list" style={{ display: 'none' }}>
          {paginadas.map(p => {
            const { label, cls } = estadoBadge(p.vencimiento, p.renovada, p.renovacion_mensual)
            return (
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }} onClick={() => { setVolverA(null); abrirDetalle(p) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.clientes?.nombre || '—'}</div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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

      {nuevaPolizaModal}

      {/* Modal confirmar eliminar póliza */}
      {confirmEliminar && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminando) setConfirmEliminar(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar esta póliza?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                Estás por eliminar la póliza <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar.numero}</strong> ({confirmEliminar.ramo}).
              </p>
              <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 20 }}>
                Esta acción no se puede deshacer. Se eliminarán también sus cuotas, pagos y documentos adjuntos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminar(null)} disabled={eliminando}>
                Cancelar
              </button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarPoliza}
                disabled={eliminando}
              >
                {eliminando ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Eliminando...</> : <><Trash2 size={14} /> Eliminar definitivamente</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <Pagination page={page} total={filtradas.length} onChange={p => setPage(p)} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}



