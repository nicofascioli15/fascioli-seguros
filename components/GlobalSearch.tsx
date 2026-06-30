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

