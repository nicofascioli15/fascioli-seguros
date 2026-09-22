'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HardHat, AlertTriangle, Wallet, Scale, FileCheck2, ShieldCheck, Loader2, ChevronRight, Plus, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ObraModal from '@/components/obras/ObraModal'
import { Barra, colorLeyes } from '@/components/obras/ui'
import { fetchObrasCompletas, type ObraCompleta } from '@/lib/obrasData'
import { formatMonto, formatFecha, obraActiva, hoyLocal, addDias, textoGarantia, type PagoObra } from '@/lib/obrasConfig'

type PagoConObra = PagoObra & { obra: ObraCompleta }

export default function ObrasDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [obras, setObras] = useState<ObraCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [showNueva, setShowNueva] = useState(false)

  useEffect(() => { fetchObrasCompletas(supabase).then(o => { setObras(o); setLoading(false) }) }, [])

  const hoy = hoyLocal()
  const en30 = addDias(hoy, 30)
  const vivas = obras
  const activas = vivas.filter(o => obraActiva(o))

  const pagosAtrasados: PagoConObra[] = vivas.flatMap(o => o.rp.vencidos.map(p => ({ ...p, obra: o }))).sort((a, b) => (a.fecha_prevista! < b.fecha_prevista! ? -1 : 1))
  const pagosProximos: PagoConObra[] = vivas.flatMap(o => o.pagos.filter(p => !p.pagado && p.fecha_prevista && p.fecha_prevista >= hoy && p.fecha_prevista <= en30).map(p => ({ ...p, obra: o })))
    .sort((a, b) => (a.fecha_prevista! < b.fecha_prevista! ? -1 : 1))
  const leyesAlerta = vivas.filter(o => o.rl.alerta === 'cerca' || o.rl.alerta === 'excedido').sort((a, b) => (b.rl.pctTope || 0) - (a.rl.pctTope || 0))
  const cierresPendientes = vivas.filter(o => !o.cerrada && o.cierre.pendiente).sort((a, b) => (a.cierre.dias ?? 0) - (b.cierre.dias ?? 0))
  const garantiasPorVencer = vivas.filter(o => o.garantia.porVencer).sort((a, b) => (a.garantia.dias ?? 0) - (b.garantia.dias ?? 0))

  // Compromisos a pagar a empresas en los próximos 30 días, separados por moneda
  const totalProx = (m: 'UYU' | 'USD') => pagosProximos.filter(p => p.obra.moneda === m).reduce((s, p) => s + p.monto, 0)
  const saldoPendiente = (m: 'UYU' | 'USD') => activas.filter(o => o.moneda === m).reduce((s, o) => s + Math.max(0, o.rp.saldo), 0)

  const cards = [
    { label: 'Obras abiertas', value: activas.length, sub: `${vivas.filter(o => o.cerrada).length} cerradas`, icon: HardHat, bg: '#FDF2E6', color: '#D9954F', href: '/obras/lista?filtro=activas' },
    { label: 'Pagos atrasados', value: pagosAtrasados.length, sub: pagosAtrasados.length ? 'Revisar con la empresa' : 'Todo al día', icon: Wallet, bg: pagosAtrasados.length ? '#FEE2E2' : '#E6F5EF', color: pagosAtrasados.length ? '#D94F4F' : '#2E9668', href: '/obras/lista?filtro=pagos_vencidos' },
    { label: 'Leyes cerca del tope', value: leyesAlerta.length, sub: `${leyesAlerta.filter(o => o.rl.alerta === 'excedido').length} ya excedidas`, icon: Scale, bg: leyesAlerta.length ? '#FEF3C7' : '#E6F5EF', color: leyesAlerta.length ? '#D97706' : '#2E9668', href: '/obras/lista?filtro=leyes' },
    { label: 'Falta F9', value: cierresPendientes.length, sub: `${cierresPendientes.filter(o => o.cierre.vencido).length} con plazo vencido`, icon: FileCheck2, bg: cierresPendientes.length ? '#FEE2E2' : '#E6F5EF', color: cierresPendientes.length ? '#D94F4F' : '#2E9668', href: '/obras/lista?filtro=cierre' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Obras</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Contratos, pagos, leyes sociales, garantías y cierres ante BPS</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNueva(true)}><Plus size={15} /> Nueva obra</button>
      </div>

      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        {cards.map(s => (
          <Link key={s.label} href={s.href} className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-card-inner">
              <div className="stat-card-text">
                <div className="label">{s.label}</div>
                <div className="value">{loading ? '—' : s.value}</div>
                <div className="sub">{s.sub}</div>
              </div>
              <div className="stat-card-icon" style={{ background: s.bg }}><s.icon size={20} color={s.color} /></div>
            </div>
          </Link>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}><Loader2 size={24} className="spin" /></div>
      ) : obras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-soft)' }}>
          <HardHat size={34} color="var(--gold)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Arrancá cargando la primera obra</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.5 }}>
            Elegís el edificio, la empresa y el tipo de obra. Después, desde la ficha, armás el plan de pagos en un click, cargás las leyes sociales contra el tope y seguís la garantía y el cierre en BPS.
          </div>
          <button className="btn-primary" onClick={() => setShowNueva(true)}><Plus size={15} /> Nueva obra</button>
        </div>
      ) : (
        <>
          {/* Compromisos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
            <Resumen titulo="A pagar próximos 30 días" lineas={[formatMonto(totalProx('UYU')), totalProx('USD') > 0 ? formatMonto(totalProx('USD'), 'USD') : null]} sub={`${pagosProximos.length} pago${pagosProximos.length === 1 ? '' : 's'} con fecha`} />
            <Resumen titulo="Saldo de obras abiertas" lineas={[formatMonto(saldoPendiente('UYU')), saldoPendiente('USD') > 0 ? formatMonto(saldoPendiente('USD'), 'USD') : null]} sub="Lo que falta pagar a las empresas" />
            <Resumen titulo="Garantías por vencer" lineas={[String(garantiasPorVencer.length)]} sub="En los próximos 60 días" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
            <Panel titulo="Pagos atrasados y próximos" icon={<CalendarClock size={16} color="var(--gold)" />} vacio="No hay pagos atrasados ni con vencimiento en los próximos 30 días.">
              {[...pagosAtrasados, ...pagosProximos].slice(0, 10).map(p => {
                const atrasado = p.fecha_prevista! < hoy
                return (
                  <Fila key={p.id} onClick={() => router.push(`/obras/${p.obra.id}`)}
                    titulo={`${p.obra.edificio} · ${p.obra.titulo}`}
                    detalle={`${p.concepto} · ${p.obra.empresa || 'sin empresa'}`}
                    derecha={<><div style={{ fontWeight: 800 }}>{formatMonto(p.monto, p.obra.moneda)}</div><div style={{ fontSize: 11.5, color: atrasado ? 'var(--danger)' : 'var(--text-muted)' }}>{atrasado ? 'Atrasado · ' : ''}{formatFecha(p.fecha_prevista)}</div></>} />
                )
              })}
            </Panel>

            <Panel titulo="Leyes sociales vs. tope" icon={<Scale size={16} color="#D97706" />} vacio="Ninguna obra está cerca del tope de leyes sociales.">
              {leyesAlerta.slice(0, 8).map(o => (
                <Fila key={o.id} onClick={() => router.push(`/obras/${o.id}`)} titulo={`${o.edificio} · ${o.titulo}`}
                  detalle={<div style={{ marginTop: 5 }}><Barra pct={Math.min(1, o.rl.pctTope || 0)} color={colorLeyes(o.rl.alerta)} /></div>}
                  derecha={<><div style={{ fontWeight: 800, color: colorLeyes(o.rl.alerta) }}>{Math.round((o.rl.pctTope || 0) * 100)}%</div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{o.rl.excedente > 0 ? `excede ${formatMonto(o.rl.excedente)}` : `quedan ${formatMonto(o.rl.disponible)}`}</div></>} />
              ))}
            </Panel>

            <Panel titulo="Cierres de obra en BPS pendientes" icon={<FileCheck2 size={16} color="var(--danger)" />} vacio="Todas las obras terminadas tienen el cierre presentado.">
              {cierresPendientes.slice(0, 8).map(o => (
                <Fila key={o.id} onClick={() => router.push(`/obras/${o.id}`)} titulo={`${o.edificio} · ${o.titulo}`}
                  detalle={`Terminada el ${formatFecha(o.fecha_fin_real)} · lo hace ${o.cierre.responsable === 'empresa' ? 'la empresa' : 'el edificio'}`}
                  derecha={<div style={{ fontSize: 12, fontWeight: 700, color: o.cierre.vencido ? 'var(--danger)' : '#B45309', textAlign: 'right' }}>{o.cierre.vencido ? `Vencido hace ${Math.abs(o.cierre.dias!)}d` : `${o.cierre.dias}d de plazo`}</div>} />
              ))}
            </Panel>

            <Panel titulo="Garantías por vencer" icon={<ShieldCheck size={16} color="#2E9668" />} vacio="No hay garantías que venzan en los próximos 60 días.">
              {garantiasPorVencer.slice(0, 8).map(o => (
                <Fila key={o.id} onClick={() => router.push(`/obras/${o.id}`)} titulo={`${o.edificio} · ${o.titulo}`}
                  detalle={`${o.empresa || 'Sin empresa'} · garantía de ${textoGarantia(o.garantia_meses, o.garantia_unidad)}`}
                  derecha={<div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', textAlign: 'right' }}>{formatFecha(o.garantia.hasta)}<div style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{o.garantia.dias}d</div></div>} />
              ))}
            </Panel>

            <Panel titulo="Obras abiertas" icon={<HardHat size={16} color="#D9954F" />} vacio="No hay obras abiertas." accion={<Link href="/obras/lista?filtro=activas" style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>Ver todas</Link>}>
              {activas.slice(0, 8).map(o => (
                <Fila key={o.id} onClick={() => router.push(`/obras/${o.id}`)} titulo={`${o.edificio} · ${o.titulo}`}
                  detalle={<div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 5 }}>
                    <div style={{ flex: 1 }}><Barra pct={o.rp.pctPagado} color="#D9954F" /></div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>pagado {Math.round(o.rp.pctPagado * 100)}%</span>
                  </div>}
                  derecha={<span className={`badge ${o.situacion.cls}`}>{o.situacion.label}</span>} />
              ))}
            </Panel>
          </div>
        </>
      )}

      {showNueva && <ObraModal onClose={() => setShowNueva(false)} onSaved={id => { setShowNueva(false); router.push(`/obras/${id}`) }} />}
    </div>
  )
}

function Resumen({ titulo, lineas, sub }: { titulo: string; lineas: (string | null)[]; sub: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{titulo}</div>
      {lineas.filter(Boolean).map((l, i) => <div key={i} style={{ fontSize: i === 0 ? 20 : 15, fontWeight: 800, marginTop: i === 0 ? 4 : 1 }}>{l}</div>)}
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>
    </div>
  )
}

function Panel({ titulo, icon, vacio, accion, children }: { titulo: string; icon: React.ReactNode; vacio: string; accion?: React.ReactNode; children: React.ReactNode }) {
  const hay = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
        {icon}<span style={{ fontWeight: 800, fontSize: 14 }}>{titulo}</span>
        <span style={{ marginLeft: 'auto' }}>{accion}</span>
      </div>
      {hay ? <div>{children}</div> : <div style={{ padding: '18px 16px', fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={13} style={{ opacity: 0 }} />{vacio}</div>}
    </div>
  )
}

function Fila({ titulo, detalle, derecha, onClick }: { titulo: string; detalle: React.ReactNode; derecha: React.ReactNode; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detalle}</div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>{derecha}</div>
      <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
    </div>
  )
}
