#!/bin/bash
set -e
mkdir -p lib components 'app/(app)/polizas' 'app/(app)/vencimientos' 'app/(app)/pagos'
cat > 'lib/export.ts' << 'FILEEOF'
// Utilidades de exportación a PDF y Excel
// Usa jsPDF + jsPDF-AutoTable (PDF) y xlsx/SheetJS (Excel)

export type Columna = { header: string; key: string; width?: number }

function formatDateNow(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export async function exportarPDF(opts: {
  titulo: string
  subtitulo?: string
  columnas: Columna[]
  filas: Record<string, any>[]
  filename: string
}) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header con branding
  doc.setFillColor(15, 30, 53) // navy
  doc.rect(0, 0, pageWidth, 64, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FASCIOLI', 32, 28)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('GASTOS COMUNES · VENTAS · ALQUILERES', 32, 40)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.titulo, pageWidth - 32, 26, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado el ${formatDateNow()}`, pageWidth - 32, 40, { align: 'right' })
  if (opts.subtitulo) {
    doc.text(opts.subtitulo, pageWidth - 32, 52, { align: 'right' })
  }

  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 80,
    head: [opts.columnas.map(c => c.header)],
    body: opts.filas.map(row => opts.columnas.map(c => row[c.key] ?? '')),
    styles: { fontSize: 9, cellPadding: 6, font: 'helvetica' },
    headStyles: { fillColor: [15, 30, 53], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 32, right: 32 },
    columnStyles: Object.fromEntries(
      opts.columnas.map((c, i) => [i, c.width ? { cellWidth: c.width } : {}])
    ),
  })

  // Footer con total de filas
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`${opts.filas.length} registros · Página ${i} de ${pageCount}`, 32, doc.internal.pageSize.getHeight() - 16)
  }

  doc.save(opts.filename.endsWith('.pdf') ? opts.filename : `${opts.filename}.pdf`)
}

export async function exportarExcel(opts: {
  titulo: string
  columnas: Columna[]
  filas: Record<string, any>[]
  filename: string
}) {
  const XLSX = await import('xlsx')

  const data = opts.filas.map(row => {
    const obj: Record<string, any> = {}
    opts.columnas.forEach(c => { obj[c.header] = row[c.key] ?? '' })
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(data)

  // Ajustar ancho de columnas
  ws['!cols'] = opts.columnas.map(c => ({ wch: c.width ? Math.round(c.width / 6) : 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, opts.titulo.slice(0, 31))
  XLSX.writeFile(wb, opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`)
}

FILEEOF
echo '+ lib/export.ts'

cat > 'components/ExportButton.tsx' << 'FILEEOF'
'use client'
import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText as FileTextIcon, Loader2 } from 'lucide-react'
import { exportarPDF, exportarExcel, Columna } from '@/lib/export'

type Props = {
  titulo: string
  subtitulo?: string
  columnas: Columna[]
  filas: Record<string, any>[]
  filename: string
  disabled?: boolean
}

export default function ExportButton({ titulo, subtitulo, columnas, filas, filename, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handlePDF() {
    setExporting('pdf')
    try { await exportarPDF({ titulo, subtitulo, columnas, filas, filename }) }
    finally { setExporting(null); setOpen(false) }
  }

  async function handleExcel() {
    setExporting('excel')
    try { await exportarExcel({ titulo, columnas, filas, filename }) }
    finally { setExporting(null); setOpen(false) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn-outline"
        onClick={() => setOpen(o => !o)}
        disabled={disabled || filas.length === 0}
        style={{ opacity: filas.length === 0 ? 0.5 : 1 }}
      >
        <Download size={15} /> Exportar
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
          background: 'white', borderRadius: 10, border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(15,30,53,.15)', overflow: 'hidden', minWidth: 180,
        }}>
          <button
            onClick={handlePDF}
            disabled={exporting !== null}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--navy)', fontFamily: 'inherit' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F4F7FB')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            {exporting === 'pdf' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileTextIcon size={15} color="var(--danger)" />}
            Descargar PDF
          </button>
          <button
            onClick={handleExcel}
            disabled={exporting !== null}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--navy)', fontFamily: 'inherit', borderTop: '1px solid var(--border)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F4F7FB')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            {exporting === 'excel' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileSpreadsheet size={15} color="#1A7A4E" />}
            Descargar Excel
          </button>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

FILEEOF
echo '+ components/ExportButton.tsx'

cat > 'app/(app)/polizas/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, X, Loader2, Paperclip, ArrowLeft, FileText, CreditCard, Bell, Upload, Download, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'
import ExportButton from '@/components/ExportButton'

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
              setEditForm({ numero: detalle.numero, ramo: detalle.ramo, compania: detalle.compania, corredor: detalle.corredor, moneda: detalle.moneda, vencimiento: detalle.vencimiento, nota: detalle.nota, cuotas: detalle.cuotas })
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
          <div className="pago-modal" style={{ width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
            {/* Sticky header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Editar póliza</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
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
                <select value={editForm.corredor || ''} onChange={e => setEditForm(p => ({...p, corredor: e.target.value}))}>
                  {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                </select></div>
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
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 3 }}>
                    Mínimo {editPagosCount} ({editPagosCount} ya pagada{editPagosCount > 1 ? 's' : ''})
                  </div>
                )}
              </div>
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
            {editFechasCuotas.length > 0 && (
              <div className="fgroup" style={{ marginTop: 8 }}>
                <label>Fechas de vencimiento por cuota</label>
                <CuotasFechas cuotas={Number(editForm.cuotas) || editFechasCuotas.length} value={editFechasCuotas} onChange={setEditFechasCuotas} />
              </div>
            )}
            </div>
            {/* Sticky footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'white', borderRadius: '0 0 14px 14px' }}>
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
              estado: estadoBadge(p.vencimiento).label,
            }))}
            filename="cartera-polizas-fascioli"
          />
          <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nueva póliza</button>
        </div>
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

      {/* Modal confirmar eliminar póliza */}
      {confirmEliminar && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminando) setConfirmEliminar(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>¿Eliminar esta póliza?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--slate)', lineHeight: 1.5, marginBottom: 4 }}>
                Estás por eliminar la póliza <strong style={{ color: 'var(--navy)' }}>{confirmEliminar.numero}</strong> ({confirmEliminar.ramo}).
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

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}



FILEEOF
echo '+ app/(app)/polizas/page.tsx'

cat > 'app/(app)/vencimientos/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Search, Phone, Mail, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ExportButton from '@/components/ExportButton'

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
                {v.cliente_tel && <a href={`https://wa.me/${v.cliente_tel.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11, color: '#25D366', borderColor: '#25D366' }}><MessageCircle size={12} /></a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Vencimientos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Pólizas ordenadas por proximidad de vencimiento</p>
        </div>
        <ExportButton
          titulo="Vencimientos de pólizas"
          subtitulo={`${filtrados.length} pólizas`}
          columnas={[
            { header: 'Cliente', key: 'cliente', width: 150 },
            { header: 'N° Póliza', key: 'numero', width: 80 },
            { header: 'Ramo', key: 'ramo', width: 80 },
            { header: 'Compañía', key: 'compania', width: 80 },
            { header: 'Vencimiento', key: 'vencimiento', width: 80 },
            { header: 'Días', key: 'dias', width: 50 },
            { header: 'Teléfono', key: 'telefono', width: 90 },
          ]}
          filas={filtrados.map(v => ({
            cliente: v.cliente_nombre,
            numero: v.numero,
            ramo: v.ramo,
            compania: v.compania,
            vencimiento: formatFecha(v.vencimiento),
            dias: v.dias !== null ? (v.dias < 0 ? `Vencida (${Math.abs(v.dias)}d)` : `${v.dias}d`) : '—',
            telefono: v.cliente_tel,
          }))}
          filename="vencimientos-fascioli"
        />
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
echo '+ app/(app)/vencimientos/page.tsx'

cat > 'app/(app)/pagos/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Search, Download, CheckCircle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'
import ExportButton from '@/components/ExportButton'

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
        <ExportButton
          titulo="Reporte de cobros"
          subtitulo={`${filtradas.length} cuotas`}
          columnas={[
            { header: 'Cliente', key: 'cliente', width: 150 },
            { header: 'N° Póliza', key: 'numero', width: 80 },
            { header: 'Ramo', key: 'ramo', width: 80 },
            { header: 'Cuota', key: 'cuota', width: 40 },
            { header: 'Vencimiento', key: 'vencimiento', width: 80 },
            { header: 'Estado', key: 'estado', width: 70 },
            { header: 'Fecha de pago', key: 'fechaPago', width: 80 },
            { header: 'Método', key: 'metodo', width: 80 },
          ]}
          filas={filtradas.map(c => ({
            cliente: c.cliente_nombre,
            numero: c.numero_poliza,
            ramo: c.ramo,
            cuota: c.cuota_num,
            vencimiento: formatFecha(c.vencimiento),
            estado: getEstado(c),
            fechaPago: c.pago_fecha ? formatFecha(c.pago_fecha) : '—',
            metodo: c.pago_metodo || '—',
          }))}
          filename="reporte-cobros-fascioli"
        />
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
echo '+ app/(app)/pagos/page.tsx'

cat > 'package.json' << 'FILEEOF'
{
  "name": "fascioli-seguros",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.12.0",
    "@supabase/supabase-js": "^2.108.0",
    "date-fns": "^4.4.0",
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.4",
    "lucide-react": "^1.17.0",
    "next": "16.2.7",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.8.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.7",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}

FILEEOF
echo '+ package.json'

npm install
git add .
git commit -m 'feat exportar PDF y Excel en polizas vencimientos y pagos'
git push
