'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, Loader2, HardHat, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSortFilter } from '@/hooks/useSortFilter'
import { SortHeader } from '@/components/SortHeader'
import { Pagination, paginate } from '@/components/Pagination'
import ExportButton from '@/components/ExportButton'
import ObraModal from '@/components/obras/ObraModal'
import { Barra, colorLeyes } from '@/components/obras/ui'
import { fetchObrasCompletas, type ObraCompleta } from '@/lib/obrasData'
import { formatMonto, formatFecha, TIPOS_OBRA, obraActiva } from '@/lib/obrasConfig'

type Filtro = 'todas' | 'activas' | 'pagos_vencidos' | 'leyes' | 'cierre' | 'garantia' | 'presupuestadas' | 'terminadas'

const FILTROS: { id: Filtro; label: string; match: (o: ObraCompleta) => boolean }[] = [
  { id: 'todas', label: 'Todas', match: o => o.estado !== 'Cancelada' },
  { id: 'activas', label: 'En curso', match: o => obraActiva(o) },
  { id: 'pagos_vencidos', label: 'Pagos atrasados', match: o => o.rp.vencidos.length > 0 },
  { id: 'leyes', label: 'Leyes cerca del tope', match: o => o.rl.alerta === 'cerca' || o.rl.alerta === 'excedido' },
  { id: 'cierre', label: 'Falta cierre BPS', match: o => o.cierre.pendiente },
  { id: 'garantia', label: 'En garantía', match: o => o.garantia.estado === 'en_garantia' },
  { id: 'presupuestadas', label: 'Presupuestadas', match: o => o.estado === 'Presupuestada' },
  { id: 'terminadas', label: 'Terminadas', match: o => o.estado === 'Finalizada' },
]

type Fila = ObraCompleta & { edificioOrden: string; finOrden: string; saldoOrden: number }

export default function ObrasListaPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [obras, setObras] = useState<ObraCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [edificio, setEdificio] = useState('')
  const [page, setPage] = useState(1)
  const [showNueva, setShowNueva] = useState(false)

  useEffect(() => {
    const f = searchParams.get('filtro') as Filtro | null
    if (f && FILTROS.some(x => x.id === f)) setFiltro(f)
    const e = searchParams.get('edificio')
    if (e) setEdificio(e)
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [searchParams])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    setObras(await fetchObrasCompletas(supabase))
    setLoading(false)
  }

  const edificios = useMemo(() => Array.from(new Map(obras.map(o => [o.cliente_id, o.edificio])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [obras])
  const matchFiltro = FILTROS.find(f => f.id === filtro)!.match

  const filtradas: Fila[] = obras
    .filter(o => matchFiltro(o))
    .filter(o => !edificio || o.cliente_id === edificio)
    .filter(o => {
      const q = search.trim().toLowerCase()
      return !q || o.titulo.toLowerCase().includes(q) || o.edificio.toLowerCase().includes(q) || (o.empresa || '').toLowerCase().includes(q)
    })
    .map(o => ({ ...o, edificioOrden: o.edificio, finOrden: o.fecha_fin_real || o.fecha_fin_prevista || '', saldoOrden: o.rp.saldo }))

  const { sort, toggleSort, sorted } = useSortFilter<Fila>(filtradas)
  const paginadas = paginate(sorted, page) as Fila[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Obras</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{obras.filter(o => obraActiva(o)).length} en curso · {obras.length} en total</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ExportButton
            titulo="Obras"
            subtitulo={`${sorted.length} obras`}
            columnas={[
              { header: 'Edificio', key: 'edificio', width: 90 },
              { header: 'Obra', key: 'titulo', width: 110 },
              { header: 'Empresa', key: 'empresa', width: 80 },
              { header: 'Precio', key: 'precio', width: 60 },
              { header: 'Pagado', key: 'pagado', width: 60 },
              { header: 'Saldo', key: 'saldo', width: 60 },
              { header: 'Leyes / tope', key: 'leyes', width: 80 },
              { header: 'Situación', key: 'situacion' },
            ]}
            filas={sorted.map(o => ({
              edificio: o.edificio, titulo: o.titulo, empresa: o.empresa || '—',
              precio: formatMonto(o.precio_total, o.moneda), pagado: formatMonto(o.rp.totalPagado, o.moneda), saldo: formatMonto(o.rp.saldo, o.moneda),
              leyes: o.rl.tope != null ? `${formatMonto(o.rl.totalFacturado)} / ${formatMonto(o.rl.tope)}` : formatMonto(o.rl.totalFacturado),
              situacion: o.situacion.label,
            }))}
            filename="obras-fascioli"
          />
          <button className="btn-primary" onClick={() => setShowNueva(true)}><Plus size={15} /> Nueva obra</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {FILTROS.map(f => {
          const n = obras.filter(f.match).length
          return (
            <button key={f.id} className={`filter-btn ${filtro === f.id ? 'active' : ''}`} onClick={() => { setFiltro(f.id); setPage(1) }}>
              {f.label}{f.id !== 'todas' && n > 0 ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar obra, edificio, empresa..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 260, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <select value={edificio} onChange={e => { setEdificio(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--navy)' }}>
          <option value="">Todos los edificios</option>
          {edificios.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={24} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />Cargando...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <HardHat size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: .5 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{obras.length === 0 ? 'Todavía no hay obras cargadas' : 'Sin obras con estos filtros'}</div>
          <div style={{ fontSize: 12 }}>{obras.length === 0 ? 'Creá la primera con "Nueva obra"' : 'Probá cambiando los filtros'}</div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <SortHeader label="Edificio" col="edificioOrden" sort={sort} onSort={toggleSort} />
                <SortHeader label="Obra" col="titulo" sort={sort} onSort={toggleSort} />
                <th>Pagos</th>
                <SortHeader label="Saldo" col="saldoOrden" sort={sort} onSort={toggleSort} />
                <th>Leyes sociales</th>
                <SortHeader label="Fin" col="finOrden" sort={sort} onSort={toggleSort} />
                <th>Situación</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginadas.map(o => (
                <tr key={o.id} onClick={() => router.push(`/obras/${o.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{o.edificio}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.titulo}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{o.empresa || 'Sin empresa'} · {TIPOS_OBRA.find(t => t.value === o.tipo_obra)?.label}</div>
                  </td>
                  <td style={{ minWidth: 130 }}>
                    <Barra pct={o.rp.pctPagado} color={o.rp.vencidos.length > 0 ? 'var(--danger)' : 'var(--gold)'} />
                    <div style={{ fontSize: 11, color: o.rp.vencidos.length > 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: 4 }}>
                      {Math.round(o.rp.pctPagado * 100)}% pagado{o.rp.vencidos.length > 0 ? ` · ${o.rp.vencidos.length} atrasado${o.rp.vencidos.length > 1 ? 's' : ''}` : ''}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatMonto(o.rp.saldo, o.moneda)}</td>
                  <td style={{ minWidth: 130 }}>
                    {o.rl.tope != null ? (
                      <>
                        <Barra pct={o.rl.pctTope || 0} color={colorLeyes(o.rl.alerta)} />
                        <div style={{ fontSize: 11, color: colorLeyes(o.rl.alerta), marginTop: 4 }}>
                          {Math.round((o.rl.pctTope || 0) * 100)}% del tope{o.rl.excedente > 0 ? ` · excede ${formatMonto(o.rl.excedente)}` : ''}
                        </div>
                      </>
                    ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.rl.totalFacturado > 0 ? formatMonto(o.rl.totalFacturado) : 'Sin tope'}</span>}
                  </td>
                  <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{o.fecha_fin_real ? formatFecha(o.fecha_fin_real) : o.fecha_fin_prevista ? <span style={{ color: 'var(--text-muted)' }}>prev. {formatFecha(o.fecha_fin_prevista)}</span> : '—'}</td>
                  <td><span className={`badge ${o.situacion.cls}`}>{o.situacion.label}</span></td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-list" style={{ display: 'none' }}>
            {paginadas.map(o => (
              <div key={o.id} onClick={() => router.push(`/obras/${o.id}`)} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{o.titulo}</div>
                  <span className={`badge ${o.situacion.cls}`} style={{ flexShrink: 0 }}>{o.situacion.label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{o.edificio} · {o.empresa || 'Sin empresa'}</div>
                <Barra pct={o.rp.pctPagado} color={o.rp.vencidos.length > 0 ? 'var(--danger)' : 'var(--gold)'} />
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{Math.round(o.rp.pctPagado * 100)}% pagado · saldo {formatMonto(o.rp.saldo, o.moneda)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Pagination page={page} total={sorted.length} onChange={setPage} />

      {showNueva && (
        <ObraModal
          edificioLocked={edificio ? { id: edificio, nombre: edificios.find(e => e[0] === edificio)?.[1] || '' } : null}
          onClose={() => setShowNueva(false)}
          onSaved={id => { setShowNueva(false); router.push(`/obras/${id}`) }}
        />
      )}
    </div>
  )
}
