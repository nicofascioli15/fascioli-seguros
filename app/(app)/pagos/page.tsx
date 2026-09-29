'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Search, CheckCircle, Loader2, X, MessageCircle, RotateCcw, AlertCircle, Clock, Hourglass, ShieldCheck, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { avisarCuotasCambiaron } from '@/lib/cuotasEvento'
import { hoyLocal } from '@/lib/obrasConfig'
import { parseMonto } from '@/components/obras/ObraForm'
import DatePicker from '@/components/DatePicker'
import ExportButton from '@/components/ExportButton'
import { Pagination, paginate } from '@/components/Pagination'
import { SortHeader } from '@/components/SortHeader'
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter'
import { useSortFilter } from '@/hooks/useSortFilter'

const estadoColor: Record<string, string> = {
  'Cobrado':    'badge-success',
  'Controlado': 'badge-blue',
  'Pendiente':  'badge-warning',
  'Vencido':    'badge-danger',
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

const DIAS_PROXIMAS = 5

function formatMontoMon(n: number, moneda: string) {
  return `${moneda || '$'} ${n.toLocaleString('es-UY', { maximumFractionDigits: 2 })}`
}

// Suma montos separando por moneda: "U$S 1.200 · $ 45.000"
function sumaPorMoneda(cs: { monto: number | null; moneda: string }[]): string {
  const m: Record<string, number> = {}
  cs.forEach(c => { if (c.monto != null) m[c.moneda || '$'] = (m[c.moneda || '$'] || 0) + c.monto })
  return Object.entries(m).map(([mon, n]) => formatMontoMon(n, mon)).join(' · ')
}

function mensajeWhatsappCuota(c: Cuota): string {
  return `Hola ${c.cliente_nombre}! Te escribimos de Fascioli Seguros para recordarte que la cuota ${c.cuota_num}${c.monto != null ? ` (${formatMontoMon(c.monto, c.moneda)})` : ''} de tu póliza de ${c.ramo} N° ${c.numero_poliza} (${c.compania}) ${(diasHasta(c.vencimiento) ?? 0) < 0 ? 'venció' : 'vence'} el ${formatFecha(c.vencimiento)}. Cualquier consulta, quedamos a disposición.`
}

type Cuota = {
  poliza_id: string
  cuota_num: number
  numero_poliza: string
  ramo: string
  compania: string
  cliente_nombre: string
  cliente_tel: string
  vencimiento: string | null
  cuota_mes?: string | null
  moneda: string
  monto: number | null          // lo cobrado si ya se cobró; si no, el monto de cuota de la póliza
  monto_cuota: number | null
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
  const [pagoForm, setPagoForm] = useState({ fecha: hoyLocal(), metodo: 'Transferencia', referencia: '', monto: '' })
  const [saving, setSaving]     = useState(false)
  const [dateVenc, setDateVenc]   = useState<DateRange>({ from: '', to: '' })
  const [dateCobro, setDateCobro] = useState<DateRange>({ from: '', to: '' })
  const [confirmDeshacer, setConfirmDeshacer] = useState<Cuota | null>(null)
  const [detalleCuota, setDetalleCuota]       = useState<Cuota | null>(null)
  const [page, setPage]                         = useState(1)

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

  function getFechaCuota(cuotaMes: string | null, n: number): string | null {
    if (!cuotaMes) return null
    const items = cuotaMes.split(' - ')
    const item = items[n - 1]
    if (!item) return null
    const parts = item.split('/')
    if (parts.length < 4) return null
    const meses: Record<string,string> = { Ene:'01',Feb:'02',Mar:'03',Abr:'04',May:'05',Jun:'06',Jul:'07',Ago:'08',Sep:'09',Oct:'10',Nov:'11',Dic:'12' }
    const d = parts[1].padStart(2,'0'), m = meses[parts[2]] || '01', y = `20${parts[3]}`
    return `${y}-${m}-${d}`
  }

  async function fetchCuotas() {
    setLoading(true)
    // Traer todas las polizas con sus clientes
    const { data: polizas } = await supabase
      .from('polizas')
      .select('*, clientes(nombre, tel)')
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
        const fechaCuota = getFechaCuota(pol.cuota_mes, n)
        rows.push({
          poliza_id:       pol.id,
          cuota_num:       n,
          numero_poliza:   pol.numero,
          ramo:            pol.ramo,
          compania:        pol.compania,
          cliente_nombre:  (pol.clientes as any)?.nombre || '—',
          cliente_tel:     (pol.clientes as any)?.tel || '',
          vencimiento:     fechaCuota,
          moneda:          pol.moneda,
          monto:           pago?.monto != null ? Number(pago.monto) : ((pol as any).monto_cuota != null ? Number((pol as any).monto_cuota) : null),
          monto_cuota:     (pol as any).monto_cuota != null ? Number((pol as any).monto_cuota) : null,
          pago_id:         pago?.id || null,
          pago_fecha:      pago?.fecha || null,
          pago_metodo:     pago?.metodo || null,
          pago_ref:        pago?.referencia || null,
        })
      }
    }
    // Orden por lo que hay que atender: vencidas (la más vieja primero), después las que vienen
    // (la más próxima primero), y al final las cobradas (la más reciente primero).
    const hoyISO = hoyLocal()
    const prioridad = (c: Cuota) => c.pago_id ? 2 : (c.vencimiento && c.vencimiento < hoyISO ? 0 : 1)
    rows.sort((a, b) => {
      const pa = prioridad(a), pb = prioridad(b)
      if (pa !== pb) return pa - pb
      if (pa === 2) return (b.pago_fecha || '').localeCompare(a.pago_fecha || '')
      if (!a.vencimiento) return 1
      if (!b.vencimiento) return -1
      return a.vencimiento.localeCompare(b.vencimiento)
    })
    setCuotas(rows)
    setLoading(false)
  }

  function abrirCobro(c: Cuota) {
    setPagoForm({ fecha: c.vencimiento && c.vencimiento <= hoyLocal() ? c.vencimiento : hoyLocal(), metodo: metodoDefault, referencia: '', monto: c.monto_cuota != null ? String(c.monto_cuota) : '' })
    setShowModal(c)
  }

  async function cobrar() {
    if (!showModal) return
    setSaving(true)
    const { data: pagoData, error } = await supabase.from('pagos').upsert([{
      poliza_id:  showModal.poliza_id,
      cuota_num:  showModal.cuota_num,
      fecha:      pagoForm.fecha,
      metodo:     pagoForm.metodo,
      referencia: pagoForm.referencia,
      ...(pagoForm.monto.trim() ? { monto: parseMonto(pagoForm.monto) } : {}),
    }], { onConflict: 'poliza_id,cuota_num' }).select().single()
    setSaving(false)
    if (error) { showToast(`No se pudo registrar el cobro: ${error.message}`, 'error'); return }
    await registrarAudit({ accion: 'crear', tabla: 'pagos', registroId: (pagoData as any)?.id, descripcion: `Pago registrado: cuota ${showModal.cuota_num} — ${showModal.ramo} ${showModal.numero_poliza} — ${showModal.cliente_nombre}`, datosDespues: pagoData })
    setShowModal(null)
    showToast('Cuota cobrada', 'success')
    avisarCuotasCambiaron()
    await fetchCuotas()
  }

  async function deshacer(c: Cuota) {
    const { data: pagoAntes } = await supabase.from('pagos').select('*').eq('poliza_id', c.poliza_id).eq('cuota_num', c.cuota_num).maybeSingle()
    const { error } = await supabase.from('pagos').delete().eq('poliza_id', c.poliza_id).eq('cuota_num', c.cuota_num)
    if (error) { showToast(`No se pudo deshacer: ${error.message}`, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'pagos', registroId: pagoAntes?.id, descripcion: `Pago deshecho: cuota ${c.cuota_num} — ${c.ramo} ${c.numero_poliza} — ${c.cliente_nombre}`, datosAntes: pagoAntes })
    avisarCuotasCambiaron()
    await fetchCuotas()
  }

  const hoy = new Date(); hoy.setHours(0,0,0,0)

  const getEstado = (c: Cuota) => {
    if (c.pago_id) {
      if (c.pago_fecha) {
        const [py, pm, pd] = c.pago_fecha.split('-').map(Number)
        const fechaPago = new Date(py, pm - 1, pd)
        if (fechaPago > hoy) return 'Controlado'
      }
      return 'Cobrado'
    }
    const d = diasHasta(c.vencimiento)
    if (d !== null && d < 0) return 'Vencido'
    return 'Pendiente'
  }

  const filtradasRaw = cuotas.filter(c => {
    const q = search.toLowerCase()
    const estado = getEstado(c)
    return (!q || c.cliente_nombre.toLowerCase().includes(q) || c.numero_poliza.toLowerCase().includes(q) || c.ramo.toLowerCase().includes(q) || (c.compania || '').toLowerCase().includes(q)) &&
           (filtro === 'Todos' || estado === filtro || (filtro === 'Próximos 5 días' && estado === 'Pendiente' && (diasHasta(c.vencimiento) ?? 99) <= 5)) &&
           (!dateVenc.from || !c.vencimiento || c.vencimiento >= dateVenc.from) &&
           (!dateVenc.to   || !c.vencimiento || c.vencimiento <= dateVenc.to) &&
           (!dateCobro.from || !c.pago_fecha || c.pago_fecha >= dateCobro.from) &&
           (!dateCobro.to   || !c.pago_fecha || c.pago_fecha <= dateCobro.to)
  })
  const { sort: sortState, toggleSort, sorted: filtradas } = useSortFilter<Cuota>(filtradasRaw)
  const paginadas = paginate(filtradas, page)

  const porEstado = (e: string) => cuotas.filter(c => getEstado(c) === e)
  const cVencidas   = porEstado('Vencido')
  const cPendientes = porEstado('Pendiente')
  const cProximas   = cPendientes.filter(c => (diasHasta(c.vencimiento) ?? 99) <= DIAS_PROXIMAS)
  const cControl    = porEstado('Controlado')
  const cCobradas   = porEstado('Cobrado')
  const tarjetas = [
    { filtro: 'Vencido',         label: 'Vencidas',                        lista: cVencidas,   color: '#DC2626', bg: '#FEF2F2', icon: AlertCircle },
    { filtro: 'Próximos 5 días', label: `Vencen en ${DIAS_PROXIMAS} días`, lista: cProximas,   color: '#D97706', bg: '#FFFBEB', icon: Clock },
    { filtro: 'Pendiente',       label: 'Pendientes',                      lista: cPendientes, color: '#B8912F', bg: '#FBF6E9', icon: Hourglass },
    { filtro: 'Controlado',      label: 'Controladas',                     lista: cControl,    color: '#2563EB', bg: '#EFF6FF', icon: ShieldCheck },
    { filtro: 'Cobrado',         label: 'Cobradas',                        lista: cCobradas,   color: '#16A34A', bg: '#F0FDF4', icon: Wallet },
  ]
  const fondoFila = (c: Cuota, estado: string) =>
    estado === 'Vencido' ? 'rgba(220,38,38,.05)' : estado === 'Pendiente' && (diasHasta(c.vencimiento) ?? 99) <= DIAS_PROXIMAS ? 'rgba(217,119,6,.06)' : 'transparent'
  const textoDias = (c: Cuota) => {
    const d = diasHasta(c.vencimiento)
    if (d == null || c.pago_id) return null
    if (d < 0) return { txt: `hace ${-d} d`, color: '#DC2626' }
    if (d === 0) return { txt: 'hoy', color: '#D97706' }
    if (d <= DIAS_PROXIMAS) return { txt: `en ${d} d`, color: '#D97706' }
    return null
  }

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
            { header: 'Monto', key: 'monto', width: 70 },
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
            monto: c.monto != null ? formatMontoMon(c.monto, c.moneda) : '—',
            vencimiento: formatFecha(c.vencimiento),
            estado: getEstado(c),
            fechaPago: c.pago_fecha ? formatFecha(c.pago_fecha) : '—',
            metodo: c.pago_metodo || '—',
          }))}
          filename="reporte-cobros-fascioli"
        />
      </div>

      {/* Resumen: cada tarjeta filtra la tabla */}
      <div className="pagos-cards">
        {tarjetas.map(t => {
          const activa = filtro === t.filtro
          const total = sumaPorMoneda(t.lista)
          const Icon = t.icon
          return (
            <button key={t.filtro} type="button" className={`pagos-card ${activa ? 'activa' : ''}`}
              onClick={() => { setFiltro(activa ? 'Todos' : t.filtro); setPage(1) }}
              style={{ ['--c' as any]: t.color, ['--bg' as any]: t.bg }}>
              <div className="pagos-card-top">
                <span className="pagos-card-label">{t.label}</span>
                <span className="pagos-card-icon"><Icon size={15} /></span>
              </div>
              <div className="pagos-card-num">{loading ? '—' : t.lista.length}</div>
              <div className="pagos-card-sub">{loading ? '' : total || (t.lista.length ? '' : 'Nada por acá')}</div>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente, póliza, ramo o compañía..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 320, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        {filtro !== 'Todos' && (
          <button onClick={() => { setFiltro('Todos'); setPage(1) }} className="filter-btn active" title="Quitar filtro"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {tarjetas.find(t => t.filtro === filtro)?.label || filtro} <X size={13} />
          </button>
        )}
        <DateRangeFilter value={dateVenc} onChange={setDateVenc} label="Vencim. cuota" />
        <DateRangeFilter value={dateCobro} onChange={setDateCobro} label="Fecha cobro" />
      </div>

      {/* Tabla */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 180 }} /><col style={{ width: 130 }} /><col style={{ width: 110 }} />
            <col style={{ width: 110 }} /><col style={{ width: 70 }} /><col style={{ width: 120 }} />
            <col style={{ width: 110 }} /><col style={{ width: 120 }} /><col style={{ width: 100 }} /><col style={{ width: 44 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label="Cliente" col="cliente_nombre" sort={sortState} onSort={toggleSort} />
              <SortHeader label="N° Póliza" col="numero_poliza" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Ramo" col="ramo" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Compañía" col="compania" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Cuota" col="cuota_num" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Vencimiento" col="vencimiento" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Monto" col="monto" sort={sortState} onSort={toggleSort} />
              <SortHeader label="Cobrado" col="pago_fecha" sort={sortState} onSort={toggleSort} />
              <th>Estado</th><th></th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando pagos...
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay cuotas registradas</div>
                <div style={{ fontSize: 12 }}>Las cuotas aparecen automáticamente cuando cargás pólizas con cuotas en Clientes</div>
              </td></tr>
            ) : paginadas.map((c, i) => {
              const estado = getEstado(c)
              return (
                <tr key={`${c.poliza_id}-${c.cuota_num}`} style={{ cursor: 'pointer', background: fondoFila(c, estado), boxShadow: estado === 'Vencido' ? 'inset 3px 0 0 #DC2626' : fondoFila(c, estado) !== 'transparent' ? 'inset 3px 0 0 #D97706' : undefined }} onClick={() => setDetalleCuota(c)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover, #F8FAFC)')}
                  onMouseLeave={e => (e.currentTarget.style.background = fondoFila(c, estado))}>
                  <td style={{ fontWeight: 600 }}>{c.cliente_nombre}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.numero_poliza}</td>
                  <td><span className="badge badge-neutral">{c.ramo}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.compania}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.cuota_num}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {formatFecha(c.vencimiento)}
                    {textoDias(c) && <div style={{ fontSize: 11, fontWeight: 700, color: textoDias(c)!.color }}>{textoDias(c)!.txt}</div>}
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{c.monto != null ? formatMontoMon(c.monto, c.moneda) : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}</td>
                  <td style={{ fontSize: 12 }}>{c.pago_fecha ? formatFecha(c.pago_fecha) + (c.pago_metodo ? ` · ${c.pago_metodo}` : '') : '—'}</td>
                  <td><span className={`badge ${estadoColor[estado]}`}>{estado}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    {c.cliente_tel && !c.pago_id && (
                      <a href={`https://wa.me/${(() => { const n = c.cliente_tel.replace(/\D/g,''); return n.startsWith('598') ? n : `598${n.replace(/^0+/,'')}` })()}?text=${encodeURIComponent(mensajeWhatsappCuota(c))}`}
                        target="_blank" rel="noreferrer" className="btn-outline btn-sm"
                        style={{ textDecoration: 'none', fontSize: 11, color: '#25D366', borderColor: '#25D366' }}>
                        <MessageCircle size={12} />
                      </a>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {(estado !== 'Cobrado' && estado !== 'Controlado')
                      ? <button className="btn-primary btn-sm" onClick={() => { abrirCobro(c) }}>
                          <CheckCircle size={12} /> Cobrar
                        </button>
                      : <button className="pagos-deshacer" title="Deshacer cobro" onClick={() => setConfirmDeshacer(c)}><RotateCcw size={13} /></button>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Mobile card list */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {paginadas.map((c, i) => {
            const estado = getEstado(c)
            return (
              <div key={`${c.poliza_id}-${c.cuota_num}`} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }}
                onClick={() => setDetalleCuota(c)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.cliente_nombre}</div>
                  <span className={`badge ${estadoColor[estado]}`}>{estado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{c.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{c.numero_poliza}</span>
                  {' · '}Cuota {c.cuota_num}{c.monto != null ? ` · ${formatMontoMon(c.monto, c.moneda)}` : ''}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.pago_fecha ? `${getEstado(c) === 'Controlado' ? 'Controlado' : 'Cobrado'} ${formatFecha(c.pago_fecha)} · ${c.pago_metodo}` : `Vence ${formatFecha(c.vencimiento)}`}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.cliente_tel && !c.pago_id && (
                      <a href={`https://wa.me/${(() => { const n = c.cliente_tel.replace(/\D/g,''); return n.startsWith('598') ? n : `598${n.replace(/^0+/,'')}` })()}?text=${encodeURIComponent(mensajeWhatsappCuota(c))}`}
                        target="_blank" rel="noreferrer" className="btn-outline btn-sm"
                        style={{ textDecoration: 'none', fontSize: 11, color: '#25D366', borderColor: '#25D366' }}>
                        <MessageCircle size={12} />
                      </a>
                    )}
                    {(estado !== 'Cobrado' && estado !== 'Controlado') && (
                      <button className="btn-primary btn-sm" onClick={() => { abrirCobro(c) }}>
                        Cobrar
                      </button>
                    )}
                  </div>
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
              {showModal.cliente_nombre} · {showModal.ramo} · Cuota {showModal.cuota_num}{showModal.monto_cuota != null ? <> · <strong style={{ color: 'var(--text-main)' }}>{formatMontoMon(showModal.monto_cuota, showModal.moneda)}</strong></> : null}
            </div>
            <div className="fgroup"><label>Monto cobrado ({showModal.moneda || '$'})</label>
              <input inputMode="decimal" value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} placeholder="Opcional — se sugiere el monto de la cuota" /></div>
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

      {/* Modal confirmar deshacer pago */}
      {confirmDeshacer && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setConfirmDeshacer(null) }}>
          <div className="pago-modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94F4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>¿Deshacer este pago?</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                <strong>{confirmDeshacer.cliente_nombre}</strong> — Póliza {confirmDeshacer.numero_poliza}
              </p>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                Cuota {confirmDeshacer.cuota_num} volverá a quedar pendiente.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDeshacer(null)}>Cancelar</button>
              <button style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => { deshacer(confirmDeshacer); setConfirmDeshacer(null) }}>
                Deshacer pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de cuota */}
      {detalleCuota && (() => {
        const estado = getEstado(detalleCuota)
        return (
          <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setDetalleCuota(null) }}>
            <div className="pago-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>{detalleCuota.cliente_nombre}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span className="badge badge-neutral">{detalleCuota.ramo}</span>
                    <span className={`badge ${estadoColor[estado]}`}>{estado}</span>
                  </div>
                </div>
                <button onClick={() => setDetalleCuota(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                {[
                  { label: 'N° Póliza',   value: detalleCuota.numero_poliza },
                  { label: 'Compañía',    value: detalleCuota.compania },
                  { label: 'Cuota',       value: detalleCuota.cuota_num },
                  { label: 'Monto',       value: detalleCuota.monto != null ? formatMontoMon(detalleCuota.monto, detalleCuota.moneda) : '—' },
                  { label: 'Vencimiento', value: formatFecha(detalleCuota.vencimiento) },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{f.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Cobro</div>
                {detalleCuota.pago_fecha ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Fecha</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{formatFecha(detalleCuota.pago_fecha)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Método</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{detalleCuota.pago_metodo || '—'}</div>
                    </div>
                    {detalleCuota.pago_ref && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Referencia</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{detalleCuota.pago_ref}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Todavía no se registró el cobro de esta cuota.</div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <a href={`/polizas?open=${detalleCuota.poliza_id}`} style={{ fontSize: 12.5, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Ver póliza completa →</a>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-outline" onClick={() => setDetalleCuota(null)}>Cerrar</button>
                  {(estado !== 'Cobrado' && estado !== 'Controlado') ? (
                    <button className="btn-primary" onClick={() => {
                      abrirCobro(detalleCuota)
                      setDetalleCuota(null)
                    }}>
                      <CheckCircle size={14} /> Cobrar
                    </button>
                  ) : (
                    <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => { setConfirmDeshacer(detalleCuota); setDetalleCuota(null) }}>
                      Deshacer pago
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <Pagination page={page} total={filtradas.length} onChange={p => setPage(p)} />
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .pagos-cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 22px; }
        @media (max-width: 1100px) { .pagos-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 640px)  { .pagos-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .pagos-card { all: unset; box-sizing: border-box; cursor: pointer; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 4px;
          background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 16px; padding: 14px 16px 13px;
          box-shadow: 0 1px 2px rgba(15,30,53,.04); transition: transform .18s, box-shadow .18s, border-color .18s; }
        .pagos-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); opacity: .85; }
        .pagos-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(15,30,53,.25); }
        .pagos-card.activa { border-color: var(--c); background: var(--bg); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 15%, transparent); }
        [data-theme="dark"] .pagos-card.activa { background: color-mix(in srgb, var(--c) 12%, var(--bg-card)); }
        .pagos-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .pagos-card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
        .pagos-card-icon { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
        .pagos-card-num { font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: var(--c); line-height: 1.1; font-variant-numeric: tabular-nums; }
        .pagos-card-sub { font-size: 12px; color: var(--text-muted); min-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pagos-deshacer { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--text-muted); cursor: pointer; opacity: .55; transition: all .15s; }
        tr:hover .pagos-deshacer { opacity: 1; border-color: var(--border); }
        .pagos-deshacer:hover { color: var(--danger); border-color: #FECACA !important; background: #FEF2F2; }
      `}</style>
    </div>
  )
}


