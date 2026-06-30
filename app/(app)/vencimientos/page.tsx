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


