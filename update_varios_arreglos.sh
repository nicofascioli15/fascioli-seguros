#!/bin/bash
set -e
mkdir -p components lib 'app/(app)/polizas' 'app/(app)/vencimientos' 'app/(app)/pagos' 'app/(app)/configuracion' 'app/(app)/clientes'
cat > 'components/Sidebar.tsx' << 'FILEEOF'
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useTheme } from '@/lib/ThemeProvider'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  Bell, AlertTriangle, FolderOpen, Settings, LogOut, Menu, X, History, UserCog, Sun, Moon
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos y cuotas' },
  { href: '/vencimientos', icon: Bell,            label: 'Vencim. pólizas' },
  { href: '/siniestros',   icon: AlertTriangle,   label: 'Siniestros' },
  { href: '/documentos',   icon: FolderOpen,      label: 'Documentos' },
]

const bottomNavItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Inicio' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/polizas',      icon: FileText,        label: 'Pólizas' },
  { href: '/vencimientos', icon: Bell,            label: 'Vencim.' },
  { href: '/pagos',        icon: CreditCard,      label: 'Pagos' },
]

const LIMIT_BYTES = 1 * 1024 * 1024 * 1024

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { esSuperAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [open, setOpen]         = useState(false)
  const [usedBytes, setUsedBytes] = useState<number | null>(null)

  useEffect(() => { fetchStorageUsage() }, [])
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
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <img src="/logo-fascioli.svg" alt="Fascioli Seguros" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menú">
            {open ? <X size={16} color="var(--gold)" /> : <><span /><span /><span /></>}
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      {/* Bottom nav fija - solo mobile */}
      <nav className="bottom-nav">
        {bottomNavItems.map(item => (
          <Link key={item.href} href={item.href}
            className={`bottom-nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
            <item.icon size={19} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'space-between', padding: '20px 16px' }}>
          <img src="/logo-fascioli.svg" alt="Fascioli Seguros"
            style={{ width: '100%', maxWidth: 150, height: 'auto', display: 'block' }} />
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            style={{ background: 'rgba(201,168,76,.1)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7, flexShrink: 0 }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,.2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,.1)')}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <div className="nav-section">Menú</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
          <div className="nav-section" style={{ marginTop: 10 }}>Sistema</div>
          <Link href="/configuracion"
            className={`nav-item ${pathname.startsWith('/configuracion') ? 'active' : ''}`}>
            <Settings size={17} />
            Configuración
          </Link>
          {esSuperAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: 10 }}>Super Admin</div>
              <Link href="/usuarios"
                className={`nav-item ${pathname.startsWith('/usuarios') ? 'active' : ''}`}>
                <UserCog size={17} />
                Usuarios
              </Link>
              <Link href="/historial"
                className={`nav-item ${pathname.startsWith('/historial') ? 'active' : ''}`}>
                <History size={17} />
                Historial
              </Link>
            </>
          )}
        </nav>

        <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Almacenamiento
              </span>
              <span style={{ fontSize: 11, color: '#B8C5D6' }}>
                {usedBytes !== null ? `${formatBytes(usedBytes)} / 1 GB` : '...'}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: barColor, transition: 'width .6s ease' }} />
            </div>
            {pct > 80 && (
              <div style={{ fontSize: 10, color: '#D94F4F', marginTop: 4, fontWeight: 600 }}>Espacio casi lleno</div>
            )}
          </div>
          <div style={{ paddingBottom: 16 }}>
            <button onClick={handleLogout} className="nav-item"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B8C5D6', width: '100%' }}>
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

cat > 'lib/configSistema.ts' << 'FILEEOF'
import { createClient } from './supabase'

export async function getConfig(clave: string, fallback: string = ''): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.from('configuracion_sistema').select('valor').eq('clave', clave).single()
  return data?.valor || fallback
}

export async function setConfig(clave: string, valor: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('configuracion_sistema').upsert({ clave, valor, updated_at: new Date().toISOString() }, { onConflict: 'clave' })
}

FILEEOF
echo '+ lib/configSistema.ts'

cat > 'app/(app)/polizas/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, X, Loader2, Paperclip, ArrowLeft, FileText, CreditCard, Bell, Upload, Download, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
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
      await registrarAudit({
        accion: 'crear', tabla: 'polizas', registroId: (polData as any).id,
        descripcion: `Póliza creada: ${form.ramo} ${form.numero} — ${clienteSeleccionado.nombre}`,
        datosDespues: polData,
      })
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
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Pólizas</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{detalle.ramo} · {detalle.numero}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
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
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className="badge badge-neutral" style={{ fontSize: 13 }}>{detalle.ramo}</span>
                <span className={`badge ${cls}`}>{label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{detalle.numero}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{detalle.clientes?.nombre}</div>
              {detalle.nota && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-main)', background: 'var(--bg-card-alt)', borderLeft: '3px solid var(--gold)', padding: '6px 12px', borderRadius: 6 }}>
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

        {/* Cuotas */}
        {detalle.cuotas > 0 && (
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
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            Documentos {detalleDocs.length > 0 && `(${detalleDocs.length})`}
          </div>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)', borderRadius: '0 0 14px 14px' }}>
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
              estado: estadoBadge(p.vencimiento).label,
            }))}
            filename="cartera-polizas-fascioli"
          />
          <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nueva póliza</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
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
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pólizas</div>
              </td></tr>
            ) : filtradas.map(p => {
              const { label, cls } = estadoBadge(p.vencimiento)
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => abrirDetalle(p)}>
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
          {filtradas.map(p => {
            const { label, cls } = estadoBadge(p.vencimiento)
            return (
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }} onClick={() => abrirDetalle(p)}>
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

      {/* Modal nueva póliza */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : 'Nueva póliza'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : '2'} de 2
                </div>
                {paso === 'poliza' && clienteSeleccionado && (
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold)', marginTop: 6 }}>
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
                    <label>Fechas de vencimiento por cuota *<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— ingresá la cantidad de cuotas primero</span></label>
                    <CuotasFechas cuotas={parseInt(form.cuotas) || 0} value={form.fechasCuotas} onChange={v => setForm({ ...form, fechasCuotas: v })} />
                  </div>
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
                    <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opcional)</span></label>
                    <textarea value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} placeholder="Descripción del bien asegurado" rows={2}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)', lineHeight: 1.5 }}
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
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
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
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{title}</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card-alt)', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>
        </div>
        {items.map(v => (
          <div key={v.id} style={{
            background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)',
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
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: .7, color: 'var(--text-muted)' }}>
                {v.dias !== null && v.dias < 0 ? 'venc.' : 'días'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{v.cliente_nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-neutral">{v.ramo}</span>
                <span style={{ fontFamily: 'monospace' }}>{v.numero}</span>
                <span>{v.compania}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Vence</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatFecha(v.vencimiento)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                {v.cliente_tel && <a href={`tel:${v.cliente_tel}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Phone size={12} /></a>}
                {v.cliente_email && <a href={`mailto:${v.cliente_email}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Mail size={12} /></a>}
                {v.cliente_tel && <a href={`https://wa.me/${(() => { const n = v.cliente_tel.replace(/\D/g,''); return n.startsWith('598') ? n : `598${n.replace(/^0+/,'')}` })()}`} target="_blank" rel="noreferrer" className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11, color: '#25D366', borderColor: '#25D366' }}><MessageCircle size={12} /></a>}
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Vencimiento de pólizas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Pólizas ordenadas por proximidad de vencimiento</p>
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
          { label: '31–90 días', count: planificados.length, bg: '#EEF2F8', color: 'var(--text-main)' },
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
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{l:'30 días',v:30},{l:'90 días',v:90},{l:'180 días',v:180},{l:'Vencidas',v:0},{l:'Todas',v:-1}].map(t =>
            <button key={t.v} onClick={() => setFiltro(t.v)} className={`filter-btn ${filtro === t.v ? 'active' : ''}`}>{t.l}</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando vencimientos...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
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

  const [metodoDefault, setMetodoDefault] = useState('Transferencia')

  useEffect(() => {
    fetchCuotas()
    supabase.from('metodos_pago').select('nombre').order('nombre')
      .then(({ data }) => {
        if (data) {
          const nombres = data.map((x:any) => x.nombre)
          setMetodos(nombres)
          supabase.from('configuracion_sistema').select('valor').eq('clave', 'metodo_pago_default').single()
            .then(({ data: cfg }) => {
              const def = cfg?.valor && nombres.includes(cfg.valor) ? cfg.valor : (nombres[0] || 'Transferencia')
              setMetodoDefault(def)
            })
        }
      })
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Pagos y vencimiento de cuotas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Seguimiento de cuotas por póliza</p>
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
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente, póliza o ramo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
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
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando pagos...
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
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
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.compania}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.cuota_num}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatFecha(c.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{c.pago_fecha ? formatFecha(c.pago_fecha) + (c.pago_metodo ? ` · ${c.pago_metodo}` : '') : '—'}</td>
                  <td><span className={`badge ${estadoColor[estado]}`}>{estado}</span></td>
                  <td>
                    {estado !== 'Cobrado'
                      ? <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: metodoDefault, referencia: '' }); setShowModal(c) }}>
                          <CheckCircle size={12} /> Cobrar
                        </button>
                      : <button className="btn-outline btn-sm" style={{ fontSize: 11, color: 'var(--text-muted)' }} onClick={() => deshacer(c)}>Deshacer</button>
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
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{c.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{c.numero_poliza}</span>
                  {' · '}Cuota {c.cuota_num}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.pago_fecha ? `Cobrado ${formatFecha(c.pago_fecha)} · ${c.pago_metodo}` : `Vence ${formatFecha(c.vencimiento)}`}
                  </div>
                  {estado !== 'Cobrado' && (
                    <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: new Date().toISOString().slice(0,10), metodo: metodoDefault, referencia: '' }); setShowModal(c) }}>
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
              <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
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

cat > 'app/(app)/configuracion/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; nombre: string }
type Tabla = 'companias' | 'ramos' | 'corredores' | 'metodos_pago' | 'tipos_siniestro' | 'tipos_documento' | 'monedas'
type CampoRamo = { id: string; nombre: string; tipo: string; opciones: string | null; orden: number }

const SECCIONES: { tabla: Tabla; titulo: string; abrev: string; placeholder: string }[] = [
  { tabla: 'companias',       titulo: 'Compañías aseguradoras',   abrev: 'CIA', placeholder: 'Ej: BSE, SURA, Mapfre...' },
  { tabla: 'ramos',           titulo: 'Ramos / Tipos de seguro',  abrev: 'RAM', placeholder: 'Ej: Incendio, RC...' },
  { tabla: 'corredores',      titulo: 'Corredores',               abrev: 'COR', placeholder: 'Ej: Fascioli...' },
  { tabla: 'metodos_pago',    titulo: 'Métodos de pago',          abrev: 'PAG', placeholder: 'Ej: Transferencia...' },
  { tabla: 'tipos_siniestro', titulo: 'Tipos de siniestro',       abrev: 'SIN', placeholder: 'Ej: Choque, Robo...' },
  { tabla: 'tipos_documento', titulo: 'Tipos de documento',       abrev: 'DOC', placeholder: 'Ej: Póliza, Endoso...' },
  { tabla: 'monedas',         titulo: 'Monedas',                  abrev: 'MON', placeholder: 'Ej: U$S, $, €...' },
]

const TIPOS_CAMPO = [
  { value: 'texto',   label: 'Texto libre' },
  { value: 'numero',  label: 'Número' },
  { value: 'select',  label: 'Lista de opciones' },
  { value: 'fecha',   label: 'Fecha' },
  { value: 'boolean', label: 'Sí / No' },
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
    if (error) showToast(`❌ ${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    else { setNuevo(''); showToast(`✓ "${nombre}" agregado`); await fetch() }
    setSaving(false)
  }

  async function eliminar(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) showToast('❌ No se pudo eliminar — puede estar en uso')
    else { showToast(`"${item.nombre}" eliminado`); await fetch() }
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.04em' }}>{abrev}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>{loading ? '...' : `${items.length} registros`}</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--text-main)', transition: 'border-color .14s' }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nuevo.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={18} style={{ display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin registros — agregá el primero arriba</div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-main)' }}>{item.nombre}</span>
            <button onClick={() => eliminar(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
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
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Campos por ramo ──────────────────────────────────────────────────────────
function CamposRamo() {
  const supabase = createClient()
  const [ramos, setRamos]         = useState<Item[]>([])
  const [ramoSel, setRamoSel]     = useState<Item | null>(null)
  const [campos, setCampos]       = useState<CampoRamo[]>([])
  const [loading, setLoading]     = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [form, setForm]           = useState({ nombre: '', tipo: 'texto', opciones: '', con_moneda: false })

  useEffect(() => {
    supabase.from('ramos').select('id, nombre').order('nombre').then(({ data }) => { if (data) setRamos(data) })
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function seleccionarRamo(ramo: Item) {
    setRamoSel(ramo); setLoading(true); setShowForm(false)
    const { data } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramo.id).order('orden')
    setCampos(data || [])
    setLoading(false)
  }

  async function agregarCampo() {
    if (!ramoSel || !form.nombre.trim()) return
    setSaving(true)
    // For numeric fields with moneda, save as "numero_moneda" type and store options as monedas
    const tipoFinal = form.tipo === 'numero' && form.con_moneda ? 'numero_moneda' : form.tipo
    await supabase.from('campos_ramo').insert([{
      ramo_id: ramoSel.id,
      nombre:  form.nombre.trim(),
      tipo:    tipoFinal,
      opciones: form.tipo === 'select' ? form.opciones : null,
      orden:   campos.length,
    }])
    setForm({ nombre: '', tipo: 'texto', opciones: '', con_moneda: false })
    setShowForm(false)
    await seleccionarRamo(ramoSel)
    showToast(`Campo "${form.nombre}" agregado`)
    setSaving(false)
  }

  async function eliminarCampo(campo: CampoRamo) {
    if (!confirm(`¿Eliminar el campo "${campo.nombre}"? Se perderán los datos existentes.`)) return
    await supabase.from('campos_ramo').delete().eq('id', campo.id)
    if (ramoSel) await seleccionarRamo(ramoSel)
    showToast(`Campo "${campo.nombre}" eliminado`)
  }

  const tipoLabel: Record<string, string> = { texto: 'Texto', numero: 'Número', numero_moneda: 'Número + Moneda', select: 'Lista', fecha: 'Fecha', boolean: 'Sí/No' }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden', gridColumn: 'span 2' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)' }}>CAM</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Campos adicionales por ramo</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>Definí campos específicos para cada tipo de seguro</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 200 }}>
        {/* Ramos list */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          {ramos.map(r => (
            <div key={r.id} onClick={() => seleccionarRamo(r)}
              style={{ padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid #F1F5FB', fontSize: 13.5, fontWeight: ramoSel?.id === r.id ? 700 : 400, color: 'var(--text-main)', background: ramoSel?.id === r.id ? 'var(--gold-pale)' : 'white', borderLeft: ramoSel?.id === r.id ? '3px solid var(--gold)' : '3px solid transparent', transition: 'all .12s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {r.nombre}
              <ChevronRight size={14} color="var(--slate)" />
            </div>
          ))}
        </div>

        {/* Campos del ramo seleccionado */}
        <div style={{ padding: '16px' }}>
          {!ramoSel ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 13 }}>
              Seleccioná un ramo para ver o agregar campos
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <Loader2 size={18} style={{ display: 'block', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {ramoSel.nombre} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>— {campos.length} campos</span>
                </div>
                <button className="btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
                  <Plus size={13} /> Agregar campo
                </button>
              </div>

              {/* Form nuevo campo */}
              {showForm && (
                <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px', marginBottom: 14, border: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                    <div className="fgroup">
                      <label>Nombre del campo *</label>
                      <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Suma asegurada" autoFocus />
                    </div>
                    <div className="fgroup">
                      <label>Tipo de campo</label>
                      <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                        {TIPOS_CAMPO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {form.tipo === 'select' && (
                      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                        <label>Opciones (separadas por coma)</label>
                        <input value={form.opciones} onChange={e => setForm({ ...form, opciones: e.target.value })} placeholder="Ej: Global, 3x2, Solo terceros" />
                      </div>
                    )}
                    {form.tipo === 'numero' && (
                      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
                          <input type="checkbox" checked={form.con_moneda} onChange={e => setForm({ ...form, con_moneda: e.target.checked })}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }} />
                          Incluir selector de moneda (ej: suma asegurada en U$S o $)
                        </label>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button className="btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                    <button className="btn-primary btn-sm" onClick={agregarCampo} disabled={saving || !form.nombre.trim()}>
                      {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar campo'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de campos */}
              {campos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-hover)', borderRadius: 8 }}>
                  Sin campos adicionales para {ramoSel.nombre}
                </div>
              ) : campos.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-soft)', marginBottom: 6, background: 'var(--bg-card)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {tipoLabel[c.tipo] || c.tipo}
                      {c.opciones && ` · ${c.opciones}`}
                    </div>
                  </div>
                  <button onClick={() => eliminarCampo(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ padding: '10px 16px', background: '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: '#1A7A4E' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function PreferenciasSistema() {
  const supabase = createClient()
  const [metodos, setMetodos]           = useState<string[]>([])
  const [metodoDefault, setMetodoDefault] = useState('')
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetchAll() {
    setLoading(true)
    const [{ data: metodosData }, { data: configData }] = await Promise.all([
      supabase.from('metodos_pago').select('nombre').order('nombre'),
      supabase.from('configuracion_sistema').select('valor').eq('clave', 'metodo_pago_default').single(),
    ])
    if (metodosData) setMetodos(metodosData.map((m: any) => m.nombre))
    if (configData?.valor) setMetodoDefault(configData.valor)
    setLoading(false)
  }

  async function guardar(valor: string) {
    setMetodoDefault(valor)
    setSaving(true)
    await supabase.from('configuracion_sistema').upsert(
      { clave: 'metodo_pago_default', valor, updated_at: new Date().toISOString() },
      { onConflict: 'clave' }
    )
    setSaving(false)
    showToast('✓ Preferencia guardada')
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
        Preferencias
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>
        Valores por defecto
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</div>
      ) : (
        <div className="fgroup" style={{ marginBottom: 0 }}>
          <label>Método de pago por defecto al registrar un cobro</label>
          <select value={metodoDefault} onChange={e => guardar(e.target.value)} disabled={saving}>
            <option value="">— Sin preferencia (usa el primero de la lista) —</option>
            {metodos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Administrá todos los catálogos del sistema</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <PreferenciasSistema />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {SECCIONES.map(s => <Seccion key={s.tabla} {...s} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <CamposRamo />
      </div>
    </div>
  )
}


FILEEOF
echo '+ app/(app)/configuracion/page.tsx'

cat > 'app/(app)/clientes/ClienteDetalle.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import DatePicker from '@/components/DatePicker'
import { ChevronRight, Paperclip, Phone, Mail, MessageCircle, Plus, X, Upload, Download, Trash2, Pencil, AlertTriangle } from 'lucide-react'

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
    <div style={{ padding: '12px', background: 'var(--bg-card-alt)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
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
              style={{ flexShrink: 0, padding: '5px 10px', border: '1.5px solid var(--border-soft)', borderRadius: 7, background: 'var(--bg-card)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
  const [confirmEliminarPoliza, setConfirmEliminarPoliza] = useState<Poliza | null>(null)
  const [eliminandoPoliza, setEliminandoPoliza] = useState(false)
  const [editPagosCount, setEditPagosCount]     = useState(0)
  const [editFechasCuotas, setEditFechasCuotas] = useState<string[]>([])

  // Pago
  const [showPagoModal, setShowPagoModal]   = useState<{ polizaId: string; cuotaNum: number; ramo: string } | null>(null)
  const [pagoForm, setPagoForm]             = useState({ fecha: new Date().toISOString().slice(0, 10), metodo: 'Transferencia', referencia: '' })
  const [savingPago, setSavingPago]         = useState(false)

  // Docs
  const [uploadingDoc, setUploadingDoc]     = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile]         = useState<File | null>(null)
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
    const [r, c, co, m, mp, td, cfg] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
      supabase.from('metodos_pago').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
      supabase.from('configuracion_sistema').select('valor').eq('clave', 'metodo_pago_default').single(),
    ])
    const nombresMetodos = (mp.data || []).map((x: any) => x.nombre)
    setCatalogos({
      ramos:     (r.data || []).map((x: any) => x.nombre),
      companias: (c.data || []).map((x: any) => x.nombre),
      corredores:(co.data || []).map((x: any) => x.nombre),
      monedas:   (m.data || []).map((x: any) => x.nombre),
      metodos:   nombresMetodos,
    })
    setTiposDoc((td.data || []).map((x: any) => x.nombre))
    setUploadTipoDoc((td.data || [])[0]?.nombre || '')
    const metodoDef = cfg?.data?.valor && nombresMetodos.includes(cfg.data.valor) ? cfg.data.valor : (nombresMetodos[0] || 'Transferencia')
    setPagoForm(p => ({ ...p, metodo: metodoDef }))
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
    setEditPolizaForm({ numero: pol.numero, ramo: pol.ramo, compania: pol.compania, corredor: pol.corredor, moneda: pol.moneda, vencimiento: pol.vencimiento, nota: pol.nota || '', cuotas: pol.cuotas })
    setEditFechasCuotas(parseFechasCuotaMes(pol.cuota_mes || ''))
    // Load pagos count
    const { count } = await supabase.from('pagos').select('id', { count: 'exact', head: true }).eq('poliza_id', pol.id)
    setEditPagosCount(count || 0)
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
    const nCuotas = Number(editPolizaForm.cuotas) || editandoPoliza.cuotas || 0
    const nuevasCuotaMes = editFechasCuotas.slice(0, nCuotas).map((f, i) => {
      if (!f) return `${i+1}/?`
      const [y,m,d] = f.split('-')
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
    }).join(' - ')
    await supabase.from('polizas').update({
      numero: editPolizaForm.numero, ramo: editPolizaForm.ramo,
      compania: editPolizaForm.compania, corredor: editPolizaForm.corredor,
      moneda: editPolizaForm.moneda, vencimiento: editPolizaForm.vencimiento || null,
      nota: editPolizaForm.nota || null,
      cuotas: nCuotas, cuota_mes: nuevasCuotaMes,
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

  async function confirmarEliminarPoliza() {
    if (!confirmEliminarPoliza) return
    const polizaId = confirmEliminarPoliza.id
    setEliminandoPoliza(true)
    const { data: polAntes } = await supabase.from('polizas').select('*').eq('id', polizaId).single()
    // Borrar documentos del storage primero
    const { data: docs } = await supabase.from('documentos').select('storage_path').eq('poliza_id', polizaId)
    if (docs && docs.length > 0) {
      await supabase.storage.from('documentos').remove(docs.map(d => d.storage_path))
    }
    // Borrar registros relacionados antes de la póliza
    await supabase.from('pagos').delete().eq('poliza_id', polizaId)
    await supabase.from('documentos').delete().eq('poliza_id', polizaId)
    await supabase.from('poliza_campos').delete().eq('poliza_id', polizaId)
    await supabase.from('siniestros').delete().eq('poliza_id', polizaId)
    const { error } = await supabase.from('polizas').delete().eq('id', polizaId)
    setEliminandoPoliza(false)
    if (error) {
      console.error('Error eliminando póliza:', error)
      showToast(`Error: ${error.message}`)
      return
    }
    setConfirmEliminarPoliza(null)
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
    setUploadFile(file)
    setShowUploadModal(true)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  async function confirmarSubida() {
    if (!uploadFile || !uploadPolizaId) return
    setUploadingDoc(uploadPolizaId)
    setShowUploadModal(false)
    const path = `${id}/${uploadPolizaId}/${Date.now()}_${uploadFile.name}`
    await supabase.storage.from('documentos').upload(path, uploadFile)
    await supabase.from('documentos').insert([{ cliente_id: id, poliza_id: uploadPolizaId, nombre: uploadFile.name, tipo: uploadTipoDoc, storage_path: path, tamanio_bytes: uploadFile.size }])
    setUploadingDoc(null); setUploadPolizaId(null); setUploadFile(null)
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{nombre}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowPolizaModal(true)}><Plus size={15} /> Nueva póliza</button>
      </div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0 }}>
        ← Volver a clientes
      </button>

      {/* Polizas */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{nombre}</div>
          <div style={{ background: 'var(--bg-card-alt)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>{polizas.length}</div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>PÓLIZAS</div>
          </div>
        </div>

        {loading ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
        : polizas.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin pólizas — creá la primera arriba</div>
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
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
                <ChevronRight size={16} style={{ marginLeft: 4, color: 'var(--text-muted)', transition: 'transform .28s ease', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
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
                    <div style={{ background: 'var(--bg-card-alt)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, borderLeft: '3px solid var(--gold)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Nota</div>
                      <div style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{pol.nota.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</div>
                    </div>
                  )}

                  {pol.poliza_campos && pol.poliza_campos.filter(pc => pc.valor && pc.campos_ramo?.nombre).length > 0 && (
                    <div style={{ background: 'var(--bg-card-alt)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Datos específicos — {pol.ramo}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        {pol.poliza_campos.filter(pc => pc.valor && pc.campos_ramo?.nombre).map((pc, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{pc.campos_ramo.nombre}</div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{formatValor(pc.valor)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fechas por cuota */}
                  {pol.cuota_mes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Fechas de vencimiento</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
                        {pol.cuota_mes.split(' - ').map((item, i) => {
                          const pagado = pol.pagos && (pol.pagos as any)[i+1]
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: pagado ? '#E6F5EF' : '#F4F7FB', borderRadius: 7, padding: '4px 10px', fontSize: 12.5, fontWeight: 500, color: 'var(--text-main)' }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: 11, minWidth: 14 }}>{i+1}</span>
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
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
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
                              <button className="btn-primary btn-sm" onClick={() => { setPagoForm(p => ({ fecha: new Date().toISOString().slice(0,10), metodo: p.metodo || catalogos.metodos[0] || 'Transferencia', referencia: '' })); setShowPagoModal({ polizaId: pol.id, cuotaNum: n, ramo: pol.ramo }) }}>
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
                    {pol.docs && pol.docs.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Documentos</div>
                        {pol.docs.map((doc: Doc) => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1F5FB' }}>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--bg-card-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Paperclip size={13} color="var(--slate)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.tipo}</div>
                            </div>
                            <button className="btn-outline btn-sm" onClick={() => descargarDoc(doc)} title="Descargar"><Download size={12} /></button>
                            <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminarDoc(doc)} title="Eliminar"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button className="btn-outline btn-sm" onClick={() => { setUploadPolizaId(pol.id); fileRef.current?.click() }} disabled={uploadingDoc === pol.id}>
                        <Upload size={13} /> {uploadingDoc === pol.id ? 'Subiendo...' : 'Subir doc'}
                      </button>
                      <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminarPoliza(pol)}>
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
              <button onClick={() => { setShowPolizaModal(false); setErrores({}) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Cliente: {nombre}</div>

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
                <label>Fechas de vencimiento por cuota *<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>— ingresá la cantidad primero</span></label>
                {Object.keys(errores).some(k => k.startsWith('fecha_cuota')) && <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>Completá todas las fechas</div>}
                <CuotasFechas cuotas={parseInt(polizaForm.cuotas) || 0} value={polizaForm.fechasCuotas} onChange={v => setPolizaForm({ ...polizaForm, fechasCuotas: v })} />
              </div>

              {camposRamo.length > 0 && (
                <div style={{ gridColumn: 'span 2', background: 'var(--bg-card-alt)', borderRadius: 10, padding: 14, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Datos específicos de {polizaForm.ramo}</div>
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
                <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opcional)</span></label>
                <textarea value={polizaForm.nota} onChange={e => setPolizaForm({ ...polizaForm, nota: e.target.value })} placeholder="Descripción del bien asegurado" rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)' }}
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
          <div className="pago-modal" style={{ width: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
            {/* Sticky header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Editar póliza</h3>
              <button onClick={() => setEditandoPoliza(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
            </div>
            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup"><label>N° Póliza</label><input value={editPolizaForm.numero || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, numero: e.target.value}))} /></div>
              <div className="fgroup"><label>Ramo</label>
                <select value={editPolizaForm.ramo || ''} onChange={async e => {
                  const nuevoRamo = e.target.value
                  setEditPolizaForm((p: any) => ({...p, ramo: nuevoRamo}))
                  setEditValoresCampos({})
                  if (nuevoRamo) {
                    const { data: rd } = await supabase.from('ramos').select('id').eq('nombre', nuevoRamo).single()
                    if (rd) {
                      const { data: campos } = await supabase.from('campos_ramo').select('*').eq('ramo_id', rd.id).order('orden')
                      setEditCamposRamo(campos || [])
                    } else setEditCamposRamo([])
                  } else setEditCamposRamo([])
                }}>
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
              <div className="fgroup">
                <label>Cantidad de cuotas</label>
                <input type="number" value={editPolizaForm.cuotas || ''} min={editPagosCount} max={36}
                  onChange={e => {
                    const n = parseInt(e.target.value) || 0
                    if (n < editPagosCount) return
                    setEditPolizaForm((p: any) => ({...p, cuotas: n}))
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
                <textarea value={editPolizaForm.nota || ''} onChange={e => setEditPolizaForm((p: any) => ({...p, nota: e.target.value}))} rows={2}
                  style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--text-main)' }} /></div>
            </div>
            {editCamposRamo.length > 0 && (
              <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 14, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Datos específicos — {editPolizaForm.ramo}</div>
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
            {editFechasCuotas.length > 0 && (
              <div className="fgroup" style={{ marginTop: 8 }}>
                <label>Fechas de vencimiento por cuota</label>
                <CuotasFechas cuotas={Number(editPolizaForm.cuotas) || editFechasCuotas.length} value={editFechasCuotas} onChange={setEditFechasCuotas} />
              </div>
            )}
            </div>
            {/* Sticky footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)', borderRadius: '0 0 14px 14px' }}>
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
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
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

      {/* Modal subir documento */}
      {showUploadModal && uploadFile && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowUploadModal(false); setUploadFile(null) } }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Subir documento</h3>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {/* File preview */}
            <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Paperclip size={16} color="var(--gold)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFile.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{(uploadFile.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
            <div className="fgroup">
              <label>Tipo de documento</label>
              <select value={uploadTipoDoc} onChange={e => setUploadTipoDoc(e.target.value)}>
                {tiposDoc.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => { setShowUploadModal(false); setUploadFile(null) }}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarSubida}>
                <Upload size={14} /> Subir archivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar póliza */}
      {confirmEliminarPoliza && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !eliminandoPoliza) setConfirmEliminarPoliza(null) }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={26} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Eliminar esta póliza?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                Estás por eliminar la póliza <strong style={{ color: 'var(--text-main)' }}>{confirmEliminarPoliza.numero}</strong> ({confirmEliminarPoliza.ramo}).
              </p>
              <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 20 }}>
                Esta acción no se puede deshacer. Se eliminarán también sus cuotas, pagos y documentos adjuntos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmEliminarPoliza(null)} disabled={eliminandoPoliza}>
                Cancelar
              </button>
              <button
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={confirmarEliminarPoliza}
                disabled={eliminandoPoliza}
              >
                {eliminandoPoliza ? <>Eliminando...</> : <><Trash2 size={14} /> Eliminar definitivamente</>}
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
echo '+ app/(app)/clientes/ClienteDetalle.tsx'

git add .
git commit -m 'fix whatsapp 598 nombre cliente destacado historial polizas renombrar nav y metodo pago default'
git push
