#!/bin/bash
set -e
mkdir -p components 'app/(app)/clientes' app
cat > 'components/GlobalSearch.tsx' << 'FILEEOF'
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, X, Users, FileText, FolderOpen, AlertTriangle, Loader2, CornerDownLeft } from 'lucide-react'

type ResultCliente   = { kind: 'cliente'; id: string; nombre: string; direccion: string | null }
type ResultPoliza    = { kind: 'poliza'; id: string; numero: string; ramo: string; cliente_id: string; cliente_nombre: string }
type ResultDocumento = { kind: 'documento'; id: string; nombre: string; tipo: string; cliente_id: string; cliente_nombre: string }
type ResultSiniestro = { kind: 'siniestro'; id: string; tipo: string; descripcion: string; cliente_id: string; cliente_nombre: string }
type Result = ResultCliente | ResultPoliza | ResultDocumento | ResultSiniestro

export default function GlobalSearch() {
  const supabase = createClient()
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [activeIdx, setActiveIdx] = useState(0)

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery(''); setResults([]); setActiveIdx(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const term = `%${q.trim()}%`

    const [clientesRes, polizasRes, docsRes, siniestrosRes] = await Promise.all([
      supabase.from('clientes').select('id, nombre, direccion').ilike('nombre', term).limit(5),
      supabase.from('polizas').select('id, numero, ramo, cliente_id, clientes(nombre)').or(`numero.ilike.${term},ramo.ilike.${term}`).limit(5),
      supabase.from('documentos').select('id, nombre, tipo, cliente_id, clientes(nombre)').ilike('nombre', term).limit(5),
      supabase.from('siniestros').select('id, tipo, descripcion, cliente_id, clientes(nombre)').or(`tipo.ilike.${term},descripcion.ilike.${term}`).limit(5),
    ])

    const out: Result[] = []
    ;(clientesRes.data || []).forEach((c: any) => out.push({ kind: 'cliente', id: c.id, nombre: c.nombre, direccion: c.direccion }))
    ;(polizasRes.data || []).forEach((p: any) => out.push({ kind: 'poliza', id: p.id, numero: p.numero, ramo: p.ramo, cliente_id: p.cliente_id, cliente_nombre: p.clientes?.nombre || '' }))
    ;(docsRes.data || []).forEach((d: any) => out.push({ kind: 'documento', id: d.id, nombre: d.nombre, tipo: d.tipo, cliente_id: d.cliente_id, cliente_nombre: d.clientes?.nombre || '' }))
    ;(siniestrosRes.data || []).forEach((s: any) => out.push({ kind: 'siniestro', id: s.id, tipo: s.tipo, descripcion: s.descripcion, cliente_id: s.cliente_id, cliente_nombre: s.clientes?.nombre || '' }))

    setResults(out)
    setActiveIdx(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  function goTo(r: Result) {
    setOpen(false)
    if (r.kind === 'cliente')   router.push(`/clientes?open=${r.id}`)
    if (r.kind === 'poliza')    router.push(`/clientes?open=${r.cliente_id}`)
    if (r.kind === 'documento') router.push(`/clientes?open=${r.cliente_id}`)
    if (r.kind === 'siniestro') router.push(`/siniestros`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIdx]) { e.preventDefault(); goTo(results[activeIdx]) }
  }

  const iconMap = { cliente: Users, poliza: FileText, documento: FolderOpen, siniestro: AlertTriangle }
  const labelMap = { cliente: 'Cliente', poliza: 'Póliza', documento: 'Documento', siniestro: 'Siniestro' }

  return (
    <>
      {/* Trigger button - se monta en el topbar del Sidebar */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 280,
          padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
          background: 'white', cursor: 'pointer', color: 'var(--slate)', fontSize: 13,
        }}
      >
        <Search size={14} />
        <span style={{ flex: 1, textAlign: 'left' }}>Buscar...</span>
        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#F1F5F9', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
          ⌘K
        </span>
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,30,53,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{ width: '92%', maxWidth: 560, background: 'white', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,.3)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <Search size={17} color="var(--slate)" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar clientes, pólizas, documentos, siniestros..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: 'inherit', color: 'var(--navy)' }}
              />
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} color="var(--slate)" />}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {query.trim().length < 2 && (
                <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>
                  Escribí al menos 2 caracteres para buscar
                </div>
              )}
              {query.trim().length >= 2 && !loading && results.length === 0 && (
                <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>
                  Sin resultados para "{query}"
                </div>
              )}
              {results.map((r, idx) => {
                const Icon = iconMap[r.kind]
                const isActive = idx === activeIdx
                const title = r.kind === 'cliente' ? r.nombre
                  : r.kind === 'poliza' ? `${r.numero} — ${r.ramo}`
                  : r.kind === 'documento' ? r.nombre
                  : r.tipo
                const subtitle = r.kind === 'cliente' ? (r.direccion || 'Sin dirección')
                  : r.kind === 'poliza' ? r.cliente_nombre
                  : r.kind === 'documento' ? `${r.tipo} · ${r.cliente_nombre}`
                  : r.cliente_nombre
                return (
                  <div
                    key={`${r.kind}-${r.id}`}
                    onClick={() => goTo(r)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', cursor: 'pointer',
                      background: isActive ? '#F4F7FB' : 'white', borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color="var(--navy)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--slate)', flexShrink: 0 }}>
                      {labelMap[r.kind]}
                    </span>
                    {isActive && <CornerDownLeft size={13} color="var(--slate)" style={{ flexShrink: 0 }} />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}

FILEEOF
echo '+ components/GlobalSearch.tsx'

cat > 'app/(app)/layout.tsx' << 'FILEEOF'
import Sidebar from '@/components/Sidebar'
import GlobalSearch from '@/components/GlobalSearch'
import { AuthProvider } from '@/lib/AuthProvider'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div className="topbar-search">
            <GlobalSearch />
          </div>
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}


FILEEOF
echo '+ app/(app)/layout.tsx'

cat > 'app/(app)/clientes/page.tsx' << 'FILEEOF'
'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ClientesList from './ClientesList'
import ClienteDetalle from './ClienteDetalle'

export default function ClientesPage() {
  const [selected, setSelected] = useState<{ id: string; nombre: string } | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId && !selected) {
      supabase.from('clientes').select('id, nombre').eq('id', openId).single().then(({ data }) => {
        if (data) {
          setSelected({ id: data.id, nombre: data.nombre })
          router.replace('/clientes')
        }
      })
    }
  }, [searchParams])

  if (selected) {
    return <ClienteDetalle id={selected.id} nombre={selected.nombre} onBack={() => setSelected(null)} />
  }

  return <ClientesList onSelect={(id, nombre) => setSelected({ id, nombre })} />
}


FILEEOF
echo '+ app/(app)/clientes/page.tsx'

cat > 'app/globals.css' << 'FILEEOF'
@import "tailwindcss";

:root {
  --navy:       #0F1E35;
  --navy-mid:   #162844;
  --navy-light: #1E3557;
  --gold:       #C9A84C;
  --gold-light: #E2C47A;
  --gold-pale:  #FBF5E6;
  --slate:      #8A9BB5;
  --slate-light:#B8C5D6;
  --surface:    #F4F7FB;
  --white:      #FFFFFF;
  --danger:     #D94F4F;
  --success:    #2E9668;
  --warning:    #D97706;
  --info:       #2563EB;
  --border:     #E2E8F0;
}

* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--surface); color: var(--navy); }

/* ── SIDEBAR ── */
.sidebar { background: var(--navy); width: 240px; min-height: 100vh; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.sidebar-logo { padding: 24px 20px 18px; border-bottom: 1px solid rgba(201,168,76,.18); display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 36px; height: 36px; border-radius: 9px; background: rgba(201,168,76,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
.logo-text .brand { font-size: 16px; font-weight: 800; color: var(--gold); letter-spacing: .04em; text-transform: uppercase; }
.logo-text .sub   { font-size: 10px; color: var(--slate); letter-spacing: .1em; text-transform: uppercase; margin-top: 1px; }
.nav-section { padding: 16px 16px 6px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--slate); }
.nav-item { display: flex; align-items: center; gap: 9px; padding: 9px 14px; margin: 2px 8px; border-radius: 8px; color: var(--slate-light); font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .14s; border: none; background: none; width: calc(100% - 16px); text-align: left; text-decoration: none; }
.nav-item:hover { background: rgba(201,168,76,.1); color: var(--gold-light); }
.nav-item.active { background: rgba(201,168,76,.16); color: var(--gold); border-left: 2px solid var(--gold); margin-left: 6px; padding-left: 12px; }

/* ── LAYOUT ── */
.app-shell { display: flex; height: 100vh; overflow: hidden; }
.main-content { flex: 1; padding: 32px; min-width: 0; overflow-y: auto; height: 100vh; scroll-behavior: smooth; }

.topbar-search { display: flex; justify-content: flex-end; margin-bottom: 18px; }
.topbar-search > button { max-width: 280px; }
@media (max-width: 768px) {
  .topbar-search { justify-content: stretch; margin-bottom: 14px; }
  .topbar-search > button { max-width: 100% !important; }
}

/* ── PAGE HEADER ── */
.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
.page-header h1 { font-size: 22px; font-weight: 800; color: var(--navy); }
.page-header p  { font-size: 13px; color: var(--slate); margin-top: 3px; }

/* ── STATS ── */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: white; border-radius: 12px; padding: 18px 20px; border: 1px solid var(--border); }
.stat-card .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); margin-bottom: 6px; }
.stat-card .value { font-size: 26px; font-weight: 800; color: var(--navy); line-height: 1; }
.stat-card .sub   { font-size: 11.5px; color: var(--slate); margin-top: 4px; }

/* ── BUTTONS ── */
.btn-primary { background: var(--gold); color: var(--navy); font-weight: 700; font-size: 13px; padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer; transition: all .14s; display: inline-flex; align-items: center; gap: 5px; }
.btn-primary:hover { background: var(--gold-light); }
.btn-outline { background: white; color: var(--navy); font-weight: 600; font-size: 13px; padding: 9px 16px; border-radius: 8px; border: 1.5px solid var(--border); cursor: pointer; transition: all .14s; display: inline-flex; align-items: center; gap: 5px; }
.btn-outline:hover { border-color: var(--gold); color: var(--gold); }
.btn-sm { padding: 5px 12px; font-size: 12px; }

/* ── SEARCH / FILTERS ── */
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
.search-wrap { position: relative; }
.search-wrap input { padding: 9px 14px 9px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13.5px; color: var(--navy); background: white; width: 280px; outline: none; font-family: inherit; transition: border-color .14s; }
.search-wrap input:focus { border-color: var(--gold); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--slate); font-size: 14px; pointer-events: none; }
.filter-btn { padding: 8px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; border: 1.5px solid var(--border); background: white; color: var(--navy); cursor: pointer; transition: all .14s; }
.filter-btn.active { background: var(--navy); border-color: var(--navy); color: white; }
.filter-btn:hover:not(.active) { border-color: var(--gold); color: var(--gold); }

/* ── TABLE ── */
.table-card { background: white; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; }
.table-card table { width: 100%; border-collapse: collapse; }
.table-card thead th { background: #F8FAFC; padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table-card tbody tr { border-bottom: 1px solid #F1F5FB; transition: background .1s; }
.table-card tbody tr:last-child { border-bottom: none; }
.table-card tbody tr:hover { background: #F8FAFC; }
.table-card tbody td { padding: 12px 14px; font-size: 13.5px; }

/* ── BADGES ── */
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: .03em; white-space: nowrap; }
.badge-success { background: #E6F5EF; color: #1A7A4E; }
.badge-warning { background: #FEF3C7; color: #92400E; }
.badge-danger  { background: #FEE2E2; color: #991B1B; }
.badge-neutral { background: #EEF2F8; color: #4A5E78; }
.badge-blue    { background: #DBEAFE; color: #1E40AF; }
.badge-gold    { background: var(--gold-pale); color: #7A5800; }

/* ── RAMO BADGES ── */
.ramo-incendio    { background: #FEE2E2; color: #991B1B; }
.ramo-multirresgo { background: #DBEAFE; color: #1E40AF; }
.ramo-ascensores  { background: #F0FDF4; color: #166534; }
.ramo-inmuebles   { background: #FEF3C7; color: #92400E; }
.ramo-cristales   { background: #E0F2FE; color: #0C4A6E; }
.ramo-vehiculos   { background: #EDE9FE; color: #4C1D95; }
.ramo-rc          { background: #FDF4FF; color: #701A75; }

/* ── CLIENTE CARDS ── */
.edif-card { background: white; border-radius: 10px; border: 1.5px solid var(--border); padding: 14px 16px; cursor: pointer; transition: all .14s; display: flex; align-items: center; gap: 12px; }
.edif-card:hover { border-color: var(--gold); box-shadow: 0 2px 10px rgba(15,30,53,.07); }
.edif-avatar { width: 38px; height: 38px; border-radius: 9px; background: var(--navy); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: var(--gold); flex-shrink: 0; }
.edif-name { font-size: 13.5px; font-weight: 700; color: var(--navy); }
.edif-addr { font-size: 11.5px; color: var(--slate); margin-top: 1px; }
.edif-del-btn { color: var(--slate); font-size: 18px; padding: 4px 6px; border-radius: 6px; cursor: pointer; line-height: 1; transition: color .14s; }
.edif-del-btn:hover { color: var(--danger); }

/* ── PÓLIZA CARDS ── */
.poliza-card { background: white; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 12px; overflow: hidden; transition: box-shadow .14s; }
.poliza-card:hover { box-shadow: 0 2px 12px rgba(15,30,53,.08); }
.poliza-card-header { padding: 14px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
.ramo-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.poliza-id   { font-size: 11px; font-family: monospace; color: var(--slate); }
.poliza-ramo { font-weight: 700; font-size: 14px; }
.poliza-card-body { border-top: 0px solid var(--border); transition: border-top .28s; }
.poliza-card-body > div { padding: 0 18px 16px; padding-top: 14px; }
.poliza-card { transition: box-shadow .25s ease; }
.poliza-card:hover { box-shadow: 0 2px 12px rgba(15,30,53,.07); }
.poliza-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
.poliza-field .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); margin-bottom: 3px; }
.poliza-field .field-val   { font-size: 13.5px; font-weight: 500; color: var(--navy); }

/* ── CUOTA ROWS ── */
.cuotas-section { margin-top: 14px; }
.cuotas-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.cuota-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; margin-bottom: 5px; border: 1.5px solid var(--border); background: white; transition: all .14s; }
.cuota-row.paid { background: #F0FDF8; border-color: #BBF7D0; }
.cuota-num { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.cuota-num.paid    { background: #E6F5EF; color: #1A7A4E; }
.cuota-num.pending { background: #EEF2F8; color: #4A5E78; }
.cuota-info { flex: 1; min-width: 0; }
.cuota-info .cuota-title { font-size: 13px; font-weight: 600; color: var(--navy); }
.cuota-info .cuota-sub   { font-size: 11.5px; color: var(--slate); margin-top: 1px; }
.cuota-paid-tag { font-size: 11px; font-weight: 700; color: #1A7A4E; background: #E6F5EF; padding: 3px 9px; border-radius: 10px; display: flex; align-items: center; gap: 4px; white-space: nowrap; }

/* ── MODALS ── */
.pago-overlay { position: fixed; inset: 0; background: rgba(15,30,53,.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity .18s; }
.pago-overlay.open { opacity: 1; pointer-events: all; }
.pago-modal { background: white; border-radius: 16px; padding: 28px; width: 420px; max-width: 95vw; box-shadow: 0 24px 60px rgba(15,30,53,.22); transform: translateY(12px); transition: transform .18s; }
.pago-overlay.open .pago-modal { transform: translateY(0); }
.fgroup { margin-bottom: 14px; }
.fgroup label { display: block; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); margin-bottom: 5px; }
.fgroup input, .fgroup select { width: 100%; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; color: var(--navy); outline: none; transition: border-color .14s; background: white; }
.fgroup input:focus, .fgroup select:focus { border-color: var(--gold); }

/* ── UPLOAD ZONE ── */
.upload-zone { border: 1.5px dashed var(--slate-light); border-radius: 8px; padding: 12px 16px; text-align: center; color: var(--slate); font-size: 12.5px; cursor: pointer; margin-top: 12px; transition: all .14s; }
.upload-zone:hover { border-color: var(--gold); color: var(--gold); background: var(--gold-pale); }

/* ── VENCIMIENTO ROWS ── */
.venc-urgente { border-left: 3px solid var(--danger); }
.venc-pronto  { border-left: 3px solid var(--warning); }

/* ── PAGINATION ── */
.pagination { display: flex; align-items: center; gap: 6px; margin-top: 14px; justify-content: flex-end; }
.pag-btn { padding: 5px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 600; border: 1.5px solid var(--border); background: white; cursor: pointer; color: var(--navy); }
.pag-btn.active { background: var(--navy); color: white; border-color: var(--navy); }

/* ── INFO CHIPS ── */
.info-chip { display: flex; flex-direction: column; gap: 2px; }
.info-chip .chip-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); }
.info-chip .chip-val   { font-size: 14px; font-weight: 600; color: var(--navy); }


/* ═══════════════════════════════════════════
   RESPONSIVE — Mobile first
   ═══════════════════════════════════════════ */

.hamburger { display: none; }
.hamburger span {
  display: block; width: 18px; height: 2px;
  background: var(--gold); border-radius: 2px; transition: all .2s;
}

.mobile-topbar {
  display: none;
  position: fixed; top: 0; left: 0; right: 0;
  height: 52px; background: var(--navy); z-index: 300;
  align-items: center; padding: 0 16px;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.mobile-topbar img { height: 26px; }
.mobile-topbar .hamburger {
  display: flex; position: static; box-shadow: none;
  background: rgba(255,255,255,.1); width: 36px; height: 36px;
  border-radius: 8px; align-items: center; justify-content: center;
  flex-direction: column; gap: 4px; padding: 8px; border: none; cursor: pointer;
}

.sidebar-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(15,30,53,.5); z-index: 250; backdrop-filter: blur(2px);
}

@media (max-width: 768px) {
  .mobile-topbar { display: flex; }
  .sidebar-overlay.open { display: block; }

  /* Sidebar drawer */
  .sidebar {
    position: fixed !important; left: -260px; top: 0;
    height: 100vh; z-index: 260; transition: left .25s ease; width: 260px !important;
  }
  .sidebar.open { left: 0; }

  /* Shell & content */
  .app-shell { display: block !important; height: auto !important; overflow: visible !important; }
  .main-content {
    padding: 64px 16px 32px !important;
    width: 100% !important; min-width: 0 !important;
    height: auto !important; overflow-y: visible !important;
    box-sizing: border-box;
  }

  /* Stats: 2x2 */
  .stats-row,
  [style*="gridTemplateColumns: 'repeat(4,1fr)'"] {
    grid-template-columns: repeat(2,1fr) !important;
    gap: 10px !important;
  }

  /* Dashboard 2-col panels → stack */
  [style*="gridTemplateColumns: '1fr 1fr'"],
  [style*="grid-template-columns: 1fr 1fr"] {
    grid-template-columns: 1fr !important;
  }

  /* 3-col → 1 col */
  [style*="gridTemplateColumns: 'repeat(3,1fr)'"],
  [style*="grid-template-columns: repeat(3,1fr)"] {
    grid-template-columns: 1fr !important;
  }

  /* Config auto-fill grid */
  [style*="minmax(320px"] { grid-template-columns: 1fr !important; }

  /* Poliza grid 3-col → 2 col */
  .poliza-grid { grid-template-columns: repeat(2,1fr) !important; }

  /* Filter buttons */
  .filter-btn { padding: 7px 10px; font-size: 12px; }

  /* Tables → mobile list */
  .table-card table { display: none; }
  .table-card .mobile-list { display: block !important; }

  /* Headers that have space-between */
  [style*="justifyContent: 'space-between'"] { flex-wrap: wrap; gap: 10px; }

  /* ── MODALS ── */
  .pago-overlay { align-items: flex-end !important; padding: 0 !important; }
  .pago-modal {
    width: 100% !important; max-width: 100% !important;
    border-radius: 20px 20px 0 0 !important;
    max-height: 90vh !important; overflow-y: auto !important;
    transform: translateY(100%) !important;
    padding: 24px 18px 32px !important;
    box-sizing: border-box !important; margin: 0 !important;
  }
  .pago-overlay.open .pago-modal { transform: translateY(0) !important; }

  /* Modal inner grids → 1 col */
  .pago-modal [style*="grid-template-columns: 1fr 1fr"],
  .pago-modal [style*="gridTemplateColumns: '1fr 1fr'"] {
    grid-template-columns: 1fr !important;
  }
  .pago-modal [style*="gridColumn: 'span 2'"],
  .pago-modal [style*="grid-column: span 2"] {
    grid-column: span 1 !important;
  }

  /* Prevent iOS zoom */
  input, select, textarea { font-size: 16px !important; }

  /* Form row 2col → 1col */
  .form-row-2col { grid-template-columns: 1fr !important; }

  /* Cuota rows wrap */
  .cuota-row { flex-wrap: wrap; gap: 8px; }
}

@media (max-width: 480px) {
  .main-content { padding: 60px 12px 20px !important; }
  .poliza-grid { grid-template-columns: 1fr !important; }
  .stat-card .value { font-size: 20px; }
  .pago-modal { padding: 20px 14px 28px !important; }
}

/* ── Page transition ── */
.main-content > div { animation: pageFadeIn .18s ease; }
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Uniform form fields ── */
.fgroup input, .fgroup select {
  height: 42px; padding: 0 13px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 14px; font-family: inherit; outline: none;
  width: 100%; background: white; color: var(--navy);
  transition: border-color .14s; box-sizing: border-box;
}
.fgroup input:focus, .fgroup select:focus { border-color: var(--gold); }
.fgroup label {
  display: block; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--slate); margin-bottom: 6px;
}
.fgroup { margin-bottom: 14px; }

/* ── Responsive 2-col form row ── */
.form-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
@media (max-width: 768px) { .form-row-2col { grid-template-columns: 1fr; } }

/* ── Stat card mobile fix ── */
@media (max-width: 768px) {
  .stat-card {
    min-width: 0;
    overflow: hidden;
  }
  .stat-card .label {
    font-size: 10px;
    white-space: normal;
    line-height: 1.3;
  }
  .stat-card .value { font-size: 24px; }
  .stat-card .sub { font-size: 11px; }
  .stat-card > div > div:last-child {
    display: none; /* hide icon on very small cards */
  }
}

/* ── Dashboard layout ── */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.stat-card-text { flex: 1; min-width: 0; }
.stat-card-icon {
  border-radius: 10px;
  padding: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.dashboard-panel {
  background: white;
  borderRadius: 12px;
  border: 1px solid var(--border);
  padding: 20px;
  border-radius: 12px;
  min-width: 0;
  overflow: hidden;
}

.acceso-rapido {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  text-decoration: none;
  transition: background .12s;
  margin-bottom: 4px;
}
.acceso-rapido:hover { background: #F4F7FB; }
.acceso-rapido-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #EEF2F8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px;
  }
  .stat-card-icon { display: none; }
  .dashboard-panels {
    grid-template-columns: 1fr !important;
    gap: 12px;
  }
  .stat-card .label { font-size: 10px; line-height: 1.3; }
  .stat-card .value { font-size: 22px; }
  .stat-card .sub { font-size: 11px; }
}

/* ── Clickable stat card ── */
a.stat-card {
  display: block;
  transition: transform .12s, box-shadow .12s;
}
a.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(15,30,53,.1);
}


FILEEOF
echo '+ app/globals.css'

git add .
git commit -m 'feat busqueda global Cmd+K clientes polizas documentos siniestros'
git push
