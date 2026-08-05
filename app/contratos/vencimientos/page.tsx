'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Loader2, ChevronRight, AlertTriangle, Bell, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  fetchCategorias, CategoriaRow, calcularAuto, calcularObra, estadoAutoBadge, estadoObraBadge,
  hoyISO, formatFecha, formatDias, diasHasta,
} from '@/lib/contratosConfig'
import { Pagination, paginate } from '@/components/Pagination'
import { SortHeader } from '@/components/SortHeader'
import { useSortFilter } from '@/hooks/useSortFilter'

type Filtro = 'vencido' | 'auto-renovado' | 'por-vencer' | 'vigente' | 'todos'

const FILTRO_INFO: Record<Filtro, { label: string; icon: any; color: string; bg: string }> = {
  vencido:         { label: 'Vencidos',                     icon: AlertTriangle, color: '#D94F4F', bg: '#FEE2E2' },
  'auto-renovado': { label: 'Auto-renovados a revisar',      icon: AlertTriangle, color: '#1D4ED8', bg: '#DBEAFE' },
  'por-vencer':    { label: 'Por vencer / seguimiento',      icon: Bell,          color: '#D97706', bg: '#FEF3C7' },
  vigente:         { label: 'Vigentes',                      icon: CheckCircle2, color: '#1A7A4E', bg: '#E6F5EF' },
  todos:           { label: 'Todos',                         icon: CheckCircle2, color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
}

type Row = {
  id: string
  categoria: string
  categoriaLabel: string
  cliente_nombre: string
  empresa: string
  tipo_contrato: string
  telegrama_no_renovacion: boolean
  autoRenovado: boolean
  dias: number | null
  proximoVenc: string | null
  estadoLabel: string
  estadoCls: string
  esVencido: boolean
  esPorVencer: boolean
  esVigente: boolean
}

export default function VencimientosContratosPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filtroUrl = searchParams.get('filtro') as Filtro | null

  const [filtro, setFiltro] = useState<Filtro>(filtroUrl && FILTRO_INFO[filtroUrl] ? filtroUrl : 'vencido')
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [categorias, setCategorias] = useState<CategoriaRow[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { setPage(1) }, [filtro, search, filtroCategoria])

  async function fetchAll() {
    setLoading(true)
    const hoy = hoyISO()
    const cats = await fetchCategorias(supabase)
    setCategorias(cats)
    const catBySlug: Record<string, CategoriaRow> = {}
    cats.forEach(c => { catBySlug[c.slug] = c })

    const { data } = await supabase.from('contratos')
      .select('id, categoria, empresa, tipo_contrato, fecha_firma_inicio, vigencia_anios, fecha_fin, garantia_meses, telegrama_no_renovacion, renovado, mant_clientes(nombre)')
      .eq('renovado', false)

    const calculadas: Row[] = ((data || []) as any[]).map(r => {
      const cat = catBySlug[r.categoria]
      const catLabel = cat?.label || r.categoria
      if (!cat || cat.tipo === 'auto') {
        const calc = calcularAuto(r.fecha_firma_inicio, r.vigencia_anios, hoy, r.telegrama_no_renovacion)
        const badge = estadoAutoBadge(calc?.estado || null, false)
        return {
          id: r.id, categoria: r.categoria, categoriaLabel: catLabel,
          cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar', empresa: r.empresa, tipo_contrato: r.tipo_contrato,
          telegrama_no_renovacion: r.telegrama_no_renovacion,
          autoRenovado: calc?.autoRenovado ?? false, dias: calc?.dias ?? null, proximoVenc: calc?.vencimiento ?? null,
          estadoLabel: badge.label, estadoCls: badge.cls,
          esVencido: calc?.estado === 'Vencido',
          esPorVencer: calc?.estado === 'Por vencer' || calc?.estado === 'Seguimiento',
          esVigente: !!calc && calc.estado !== 'Vencido' && calc.estado !== 'Por vencer' && calc.estado !== 'Seguimiento',
        }
      }
      const calc = calcularObra(r.fecha_fin, r.garantia_meses, hoy)
      const badge = estadoObraBadge(calc?.estado || null)
      return {
        id: r.id, categoria: r.categoria, categoriaLabel: catLabel,
        cliente_nombre: r.mant_clientes?.nombre || 'Sin asignar', empresa: r.empresa, tipo_contrato: r.tipo_contrato,
        telegrama_no_renovacion: false,
        autoRenovado: false, dias: diasHasta(calc?.garantiaHasta ?? null),
        proximoVenc: calc?.garantiaHasta ?? null,
        estadoLabel: badge.label, estadoCls: badge.cls,
        esVencido: false,
        esPorVencer: calc?.estado === 'En ejecución',
        esVigente: !!calc && calc.estado !== 'En ejecución',
      }
    })
    setRows(calculadas)
    setLoading(false)
  }

  function matchFiltroFor(f: Filtro) {
    return (r: Row) => {
      if (f === 'todos') return true
      if (f === 'vencido') return r.esVencido
      if (f === 'auto-renovado') return r.autoRenovado
      if (f === 'por-vencer') return r.esPorVencer
      if (f === 'vigente') return r.esVigente
      return true
    }
  }

  const filtrados = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.cliente_nombre.toLowerCase().includes(q) || r.empresa.toLowerCase().includes(q) || r.tipo_contrato.toLowerCase().includes(q)
    const matchCat = !filtroCategoria || r.categoria === filtroCategoria
    return matchFiltroFor(filtro)(r) && matchSearch && matchCat
  })
  const { sort, toggleSort, sorted } = useSortFilter<Row>(filtrados)
  const paginados = paginate(sorted, page)

  function irACategoria(r: Row) {
    router.push(`/contratos/categoria/${r.categoria}`)
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Vencimientos y seguimiento</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Contratos de todas las categorías, agrupados por estado</p>
      </div>

      {/* Segmentos (mismos 4 que las cards del dashboard) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {(Object.keys(FILTRO_INFO) as Filtro[]).map(f => {
          const info = FILTRO_INFO[f]
          const activo = filtro === f
          return (
            <button key={f} onClick={() => setFiltro(f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9,
                border: activo ? `1.5px solid ${info.color}` : '1.5px solid var(--border-soft)',
                background: activo ? info.bg : 'var(--bg-card)', color: activo ? info.color : 'var(--text-muted)',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              }}>
              <info.icon size={14} /> {info.label}
              <span style={{ fontSize: 11, fontWeight: 800, opacity: .8 }}>({rows.filter(matchFiltroFor(f)).length})</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar edificio, empresa, tipo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        {categorias.length > 1 && (
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--navy)' }}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay contratos en esta categoría de estado</div>
          <div style={{ fontSize: 12 }}>Probá con otro filtro de arriba</div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <SortHeader label="Edificio" col="cliente_nombre" sort={sort} onSort={toggleSort} />
                <SortHeader label="Categoría" col="categoriaLabel" sort={sort} onSort={toggleSort} />
                <SortHeader label="Empresa" col="empresa" sort={sort} onSort={toggleSort} />
                <SortHeader label="Tipo" col="tipo_contrato" sort={sort} onSort={toggleSort} />
                <SortHeader label="Vencimiento" col="proximoVenc" sort={sort} onSort={toggleSort} />
                <th>Estado</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => irACategoria(r)}>
                  <td style={{ fontWeight: 600 }}>{r.cliente_nombre}</td>
                  <td>{r.categoriaLabel}</td>
                  <td>{r.empresa || '—'}</td>
                  <td>{r.tipo_contrato || '—'}</td>
                  <td>
                    {formatFecha(r.proximoVenc)}
                    {r.dias !== null && (
                      <div style={{ fontSize: 11, color: r.dias <= 90 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: r.dias <= 90 ? 700 : 400 }}>{formatDias(r.dias)}</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${r.estadoCls}`}>{r.estadoLabel}</span>
                    {r.autoRenovado && <span className="badge badge-blue" style={{ marginLeft: 5 }}>Auto-renovado</span>}
                  </td>
                  <td><ChevronRight size={15} color="var(--text-muted)" /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-list" style={{ display: 'none' }}>
            {paginados.map(r => (
              <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }} onClick={() => irACategoria(r)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.cliente_nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`badge ${r.estadoCls}`}>{r.estadoLabel}</span>
                    <ChevronRight size={15} color="var(--text-muted)" />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {r.categoriaLabel}{r.empresa && ` · ${r.empresa}`}{r.tipo_contrato && ` · ${r.tipo_contrato}`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Vencimiento {formatFecha(r.proximoVenc)}
                  {r.dias !== null && (
                    <span style={{ color: r.dias <= 90 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: r.dias <= 90 ? 700 : 400 }}> · {formatDias(r.dias)}</span>
                  )}
                </div>
                {r.autoRenovado && <span className="badge badge-blue" style={{ marginTop: 6, display: 'inline-block' }}>Auto-renovado</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <Pagination page={page} total={filtrados.length} onChange={setPage} />
    </div>
  )
}
