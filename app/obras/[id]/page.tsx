'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Pencil, Trash2, Building2, Briefcase, AlertTriangle, Wallet, Scale, ShieldCheck, FileText, MessageSquareText, ClipboardList, CalendarClock, CheckCircle2, Circle, FileCheck2, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import ObraModal from '@/components/obras/ObraModal'
import ObraPagos from '@/components/obras/ObraPagos'
import ObraLeyes from '@/components/obras/ObraLeyes'
import ObraCierre from '@/components/obras/ObraCierre'
import ObraDocumentos from '@/components/obras/ObraDocumentos'
import ObraComentarios from '@/components/obras/ObraComentarios'
import { Barra, Kpi, colorLeyes } from '@/components/obras/ui'
import { imprimirObraPDF } from '@/lib/obraPdf'
import CuentaBanco from '@/components/obras/CuentaBanco'
import { fetchObrasCompletas, soloColumnasObra, type ObraCompleta } from '@/lib/obrasData'
import { formatMonto, formatFecha, TIPOS_OBRA, textoGarantia, cuotasPagas, tieneF9 } from '@/lib/obrasConfig'

type Tab = 'pagos' | 'leyes' | 'cierre' | 'documentos' | 'comentarios' | 'datos'

export default function ObraFichaPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()
  const [obra, setObra] = useState<ObraCompleta | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('pagos')
  const [editando, setEditando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [tipoDocInicial, setTipoDocInicial] = useState<string | undefined>(undefined)
  const [tiposDocs, setTiposDocs] = useState<string[]>([])
  const [imprimiendo, setImprimiendo] = useState(false)
  const [empresaDatos, setEmpresaDatos] = useState<{ rut?: string | null; contacto?: string | null; tel?: string | null; email?: string | null; banco?: string | null; nro_cuenta?: string | null } | null>(null)

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const [[o], { data: docs }] = await Promise.all([
      fetchObrasCompletas(supabase, { obraId: id }),
      supabase.from('obras_documentos').select('tipo').eq('obra_id', id),
    ])
    setObra(o || null)
    setTiposDocs((docs || []).map((d: any) => d.tipo || ''))
    // Datos de la empresa (banco y cuenta se muestran en el encabezado)
    if (o?.empresa) {
      const { data: emp } = await supabase.from('obras_empresas').select('*').ilike('nombre', o.empresa.replace(/[%_\\]/g, m => '\\' + m)).limit(1).maybeSingle()
      setEmpresaDatos(emp || null)
    } else setEmpresaDatos(null)
  }

  async function imprimir() {
    if (!obra) return
    setImprimiendo(true)
    try {
      const [{ data: ed }, { data: emp }, { data: docs }, { data: coms }] = await Promise.all([
        supabase.from('mant_clientes').select('direccion').eq('id', obra.cliente_id).maybeSingle(),
        Promise.resolve({ data: empresaDatos }),
        supabase.from('obras_documentos').select('nombre, tipo, created_at').eq('obra_id', obra.id).order('created_at'),
        supabase.from('obras_comentarios').select('fecha, texto').eq('obra_id', obra.id).order('fecha', { ascending: false }),
      ])
      await imprimirObraPDF(obra, { direccion: ed?.direccion, empresaDatos: emp, documentos: docs || [], comentarios: coms || [] })
    } catch (e: any) {
      showToast(`No se pudo generar el PDF: ${e?.message || e}`, 'error')
    }
    setImprimiendo(false)
  }

  function irA(t: Tab, tipoDoc?: string) {
    if (tipoDoc) setTipoDocInicial(tipoDoc)
    setTab(t)
  }

  async function eliminar() {
    if (!obra) return
    setEliminando(true)
    const { data: docs } = await supabase.from('obras_documentos').select('storage_path').eq('obra_id', obra.id)
    const paths = (docs || []).map((d: any) => d.storage_path).filter(Boolean)
    // Primero se borra la obra y recién después los archivos: si el borrado falla, no se pierden adjuntos.
    const { error } = await supabase.from('obras').delete().eq('id', obra.id)
    if (error) { setEliminando(false); showToast(error.message, 'error'); return }
    if (paths.length) await supabase.storage.from('documentos').remove(paths)
    setEliminando(false)
    await registrarAudit({ accion: 'eliminar', tabla: 'obras', registroId: obra.id, descripcion: `Obra eliminada: ${obra.titulo} — ${obra.edificio}`, datosAntes: soloColumnasObra(obra) })
    showToast('Obra eliminada', 'success')
    router.push('/obras/lista')
  }

  if (obra === undefined) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={24} className="spin" /></div>
  if (obra === null) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>No se encontró la obra</div>
      <Link href="/obras/lista" className="btn-outline">Volver a Obras</Link>
    </div>
  )

  const etiqueta = `${obra.titulo} (${obra.edificio})`
  const alertas: { tono: 'danger' | 'warning'; texto: string; tab: Tab }[] = []
  if (obra.rp.vencidos.length > 0) alertas.push({ tono: 'danger', tab: 'pagos', texto: `${obra.rp.vencidos.length} pago${obra.rp.vencidos.length > 1 ? 's' : ''} atrasado${obra.rp.vencidos.length > 1 ? 's' : ''} por ${formatMonto(obra.rp.vencidos.reduce((s, p) => s + p.monto, 0), obra.moneda)}` })
  if (obra.rl.alerta === 'excedido') alertas.push({ tono: 'danger', tab: 'leyes', texto: `Leyes sociales pasadas del tope por ${formatMonto(obra.rl.excedente)}: descontarlo de los pagos a la empresa` })
  if (obra.rl.alerta === 'cerca') alertas.push({ tono: 'warning', tab: 'leyes', texto: `Leyes sociales al ${Math.round((obra.rl.pctTope || 0) * 100)}% del tope` })
  if (obra.cierre.pendiente) alertas.push({ tono: obra.cierre.vencido ? 'danger' : 'warning', tab: 'cierre', texto: obra.cierre.vencido ? `Cierre de obra en BPS vencido (plazo ${formatFecha(obra.cierre.limite)})` : `Falta el cierre de obra en BPS: plazo hasta ${formatFecha(obra.cierre.limite)}` })
  if (obra.garantia.porVencer) alertas.push({ tono: 'warning', tab: 'cierre', texto: `La garantía vence el ${formatFecha(obra.garantia.hasta)} (${obra.garantia.dias} días)` })
  if (obra.precio_total != null && obra.pagos.length > 0 && Math.abs(obra.rp.diferenciaPlan) >= 0.01) alertas.push({ tono: 'warning', tab: 'pagos', texto: `El plan de pagos no coincide con el precio (diferencia ${formatMonto(obra.rp.diferenciaPlan, obra.moneda)})` })

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'pagos', label: 'Pagos', icon: Wallet, badge: obra.rp.vencidos.length || undefined },
    { id: 'leyes', label: 'Leyes sociales', icon: Scale },
    { id: 'cierre', label: 'Cierre BPS y garantía', icon: ShieldCheck, badge: obra.cierre.pendiente ? 1 : undefined },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'comentarios', label: 'Comentarios', icon: MessageSquareText },
    { id: 'datos', label: 'Datos', icon: ClipboardList },
  ]

  const prox = obra.rp.proximoPago

  return (
    <div>
      <Link href="/obras/lista" className="btn-outline btn-sm" style={{ marginBottom: 14, display: 'inline-flex' }}><ArrowLeft size={13} /> Obras</Link>

      {/* Encabezado */}
      <div style={{ background: 'var(--navy)', borderRadius: 16, padding: '20px 22px', marginBottom: 16, color: 'white', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className={`badge ${obra.situacion.cls}`}>{obra.situacion.label}</span>
            <span className="badge badge-neutral">{TIPOS_OBRA.find(t => t.value === obra.tipo_obra)?.label}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{obra.titulo}</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 13, color: '#B8C5D6' }}>
            <Link href={`/obras/lista?edificio=${obra.cliente_id}`} style={{ color: '#E2C47A', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}><Building2 size={13} /> {obra.edificio}</Link>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Briefcase size={13} /> {obra.empresa || 'Sin empresa'}</span>
            {(empresaDatos?.banco || empresaDatos?.nro_cuenta) && <CuentaBanco banco={empresaDatos.banco} cuenta={empresaDatos.nro_cuenta} oscuro />}
            {(obra.fecha_inicio || obra.fecha_fin_prevista) && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CalendarClock size={13} /> {formatFecha(obra.fecha_inicio)} → {obra.fecha_fin_real ? formatFecha(obra.fecha_fin_real) : `prev. ${formatFecha(obra.fecha_fin_prevista)}`}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!obra.cerrada && (
            <button className="btn-outline btn-sm" style={{ background: 'rgba(226,196,122,.15)', color: '#E2C47A', borderColor: 'rgba(226,196,122,.4)' }} onClick={() => setTab('cierre')}>
              <FileCheck2 size={13} /> {obra.fecha_fin_real ? 'Cierre BPS (F9)' : 'Fin de obra y F9'}
            </button>
          )}
          <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={imprimir} disabled={imprimiendo} title="Descargar la ficha completa en PDF">{imprimiendo ? <Loader2 size={13} className="spin" /> : <Printer size={13} />} PDF</button>
          <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={() => setEditando(true)}><Pencil size={13} /> Editar</button>
          <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: '#FCA5A5', borderColor: 'rgba(252,165,165,.35)' }} onClick={() => setConfirmEliminar(true)}><Trash2 size={13} /></button>
        </div>
      </div>

      <ProximosPasos pasos={[
        { hecho: obra.precio_total != null, texto: 'Precio del contrato', onClick: () => setEditando(true) },
        { hecho: !!obra.fecha_contrato, texto: 'Fecha de firma (desde ahí corre la garantía)', onClick: () => setEditando(true) },
        { hecho: obra.pagos.length > 0, texto: 'Plan de pagos', onClick: () => irA('pagos') },
        { hecho: tiposDocs.includes('Contrato'), texto: 'Subir el contrato firmado', onClick: () => irA('documentos', 'Contrato') },
        ...(obra.tipo_obra !== 'menor_cuantia' ? [{ hecho: obra.tope_leyes != null, texto: 'Tope de leyes sociales', onClick: () => irA('leyes') }] : []),
        { hecho: !!obra.nro_obra_bps, texto: 'N° de obra BPS', onClick: () => setEditando(true) },
        { hecho: !!obra.fecha_fin_real, texto: 'Marcar fin de obra', onClick: () => irA('cierre') },
      ]} />

      {/* Cierre de la obra: se cierra sola cuando están las cuotas pagas y el F9 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: obra.cerrada ? '#E6F5EF' : 'var(--bg-card)', border: `1px solid ${obra.cerrada ? '#BBF7D0' : 'var(--border-soft)'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: obra.cerrada ? '#1A7A4E' : 'var(--text-main)' }}>{obra.cerrada ? 'Obra cerrada' : 'Para cerrar la obra'}</div>
        <button onClick={() => irA('pagos')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--text-main)', padding: 0 }}>
          {cuotasPagas(obra.pagos) ? <CheckCircle2 size={16} color="#2E9668" /> : <Circle size={16} color="var(--gold)" />} Cuotas pagas {obra.pagos.length > 0 && <span style={{ color: 'var(--text-muted)' }}>({obra.pagos.filter(p => p.pagado).length}/{obra.pagos.length})</span>}
        </button>
        <button onClick={() => irA('cierre')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--text-main)', padding: 0 }}>
          {tieneF9(obra.cierre_bps_estado) ? <CheckCircle2 size={16} color="#2E9668" /> : <Circle size={16} color="var(--gold)" />} F9 (cierre BPS)
        </button>
        {!obra.cerrada && <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>Se cierra sola cuando se cumplen las dos</span>}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Kpi label="Precio del contrato" valor={formatMonto(obra.precio_total, obra.moneda)} sub={obra.fecha_contrato ? `Firmado el ${formatFecha(obra.fecha_contrato)}` : 'Sin fecha de firma'} />
        <Kpi label="Pagado" valor={formatMonto(obra.rp.totalPagado, obra.moneda)} sub={<><Barra pct={obra.rp.pctPagado} /><div style={{ marginTop: 4 }}>{Math.round(obra.rp.pctPagado * 100)}% · saldo {formatMonto(obra.rp.saldo, obra.moneda)}</div></>} />
        <Kpi label="Próximo pago" valor={prox ? formatMonto(prox.monto, obra.moneda) : '—'} color={prox && obra.rp.vencidos.includes(prox) ? 'var(--danger)' : undefined}
          sub={prox ? `${prox.concepto} · ${prox.fecha_prevista ? formatFecha(prox.fecha_prevista) : prox.condicion || 'sin fecha'}` : obra.pagos.length ? 'Todo pagado' : 'Sin plan de pagos'} />
        <Kpi label="Leyes sociales" valor={formatMonto(obra.rl.totalFacturado)} color={obra.rl.alerta === 'excedido' ? 'var(--danger)' : undefined}
          sub={obra.rl.tope != null ? <><Barra pct={Math.min(1, obra.rl.pctTope || 0)} color={colorLeyes(obra.rl.alerta)} /><div style={{ marginTop: 4 }}>tope {formatMonto(obra.rl.tope)}</div></> : 'Sin tope definido'} />
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {alertas.map((a, i) => (
            <button key={i} onClick={() => setTab(a.tab)} style={{
              display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer', border: 'none', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontWeight: 600,
              background: a.tono === 'danger' ? '#FEE2E2' : '#FEF3C7', color: a.tono === 'danger' ? '#991B1B' : '#92400E',
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {a.texto}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: `2.5px solid ${tab === t.id ? 'var(--gold)' : 'transparent'}`, marginBottom: -1,
            color: tab === t.id ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: tab === t.id ? 800 : 600, fontSize: 13.5, fontFamily: 'inherit',
          }}>
            <t.icon size={15} /> {t.label}
            {t.badge ? <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 9, fontSize: 10, fontWeight: 800, padding: '1px 6px' }}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'pagos' && <ObraPagos obra={obra} onChange={cargar} />}
      {tab === 'leyes' && <ObraLeyes obra={obra} onChange={cargar} />}
      {tab === 'cierre' && <ObraCierre obra={obra} onChange={cargar} onPedirDocumento={() => { setTipoDocInicial('Cierre de obra BPS (F9)'); setTab('documentos') }} />}
      {tab === 'documentos' && <ObraDocumentos obraId={obra.id} etiqueta={etiqueta} tipoInicial={tipoDocInicial} onCount={() => { supabase.from('obras_documentos').select('tipo').eq('obra_id', obra.id).then(({ data }) => setTiposDocs((data || []).map((d: any) => d.tipo || ''))) }} />}
      {tab === 'comentarios' && <ObraComentarios obraId={obra.id} etiqueta={etiqueta} />}
      {tab === 'datos' && <DatosObra obra={obra} onEditar={() => setEditando(true)} />}

      {editando && <ObraModal obra={obra} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); cargar() }} />}

      <ConfirmDialog
        open={confirmEliminar}
        title="¿Eliminar esta obra?"
        message={<>Se va a eliminar <strong style={{ color: 'var(--text-main)' }}>{obra.titulo}</strong> de {obra.edificio}, con su plan de pagos, leyes sociales, documentos y comentarios. <strong style={{ color: 'var(--text-main)' }}>No se puede deshacer</strong>: el historial solo guarda los datos generales de la obra. Si solo terminó, mejor marcala "Finalizada" o "Cancelada".</>}
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(false)}
      />
    </div>
  )
}

// Lista de lo que falta completar en la ficha: la obra se crea con lo mínimo y se va cargando después.
function ProximosPasos({ pasos }: { pasos: { hecho: boolean; texto: string; onClick: () => void }[] }) {
  const faltan = pasos.filter(p => !p.hecho)
  if (faltan.length === 0) return null
  const hechos = pasos.length - faltan.length
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>Completar la ficha</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{hechos} de {pasos.length}</div>
      </div>
      <div style={{ marginBottom: 10 }}><Barra pct={hechos / pasos.length} color="#2E9668" /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {pasos.map(p => (
          <button key={p.texto} onClick={p.onClick} disabled={p.hecho} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${p.hecho ? 'transparent' : 'var(--border)'}`, borderRadius: 20,
            padding: '5px 11px', fontSize: 12, fontFamily: 'inherit', cursor: p.hecho ? 'default' : 'pointer',
            background: p.hecho ? 'var(--bg-card-alt)' : 'var(--bg-card)', color: p.hecho ? 'var(--text-muted)' : 'var(--text-main)',
            textDecoration: p.hecho ? 'line-through' : 'none', fontWeight: p.hecho ? 500 : 600,
          }}>
            {p.hecho ? <CheckCircle2 size={13} color="#2E9668" /> : <Circle size={13} color="var(--gold)" />} {p.texto}
          </button>
        ))}
      </div>
    </div>
  )
}

function DatosObra({ obra, onEditar }: { obra: ObraCompleta; onEditar: () => void }) {
  const filas: [string, React.ReactNode][] = [
    ['Edificio', obra.edificio],
    ['Empresa', obra.empresa || '—'],
    ['Tipo de obra', TIPOS_OBRA.find(t => t.value === obra.tipo_obra)?.label],
    ['Inscripta a nombre de', obra.tipo_obra === 'menor_cuantia' || obra.titular_bps === 'empresa' ? 'La empresa' : 'El edificio'],
    ['El cierre (F9) lo hace', obra.cierre.responsable === 'empresa' ? 'La empresa' : 'La administración'],
    ['N° de obra BPS', obra.nro_obra_bps || '—'],
    ['Inscripción BPS', formatFecha(obra.fecha_inscripcion_bps)],
    ['Moneda', obra.moneda === 'USD' ? 'Dólares' : 'Pesos'],
    ['Precio total', formatMonto(obra.precio_total, obra.moneda)],
    ['Firma del contrato', formatFecha(obra.fecha_contrato)],
    ['Inicio', formatFecha(obra.fecha_inicio)],
    ['Fin previsto', formatFecha(obra.fecha_fin_prevista)],
    ['Fin real', formatFecha(obra.fecha_fin_real)],
    ['Situación', obra.cerrada ? 'Cerrada' : 'Abierta'],
    ['Tope leyes sociales', formatMonto(obra.tope_leyes)],
    ['Garantía', `${textoGarantia(obra.garantia_meses, obra.garantia_unidad)}${obra.garantia.hasta ? ` · vence ${formatFecha(obra.garantia.hasta)}` : ''}`],
    ['Cierre BPS', `${obra.cierre_bps_estado}${obra.cierre_bps_fecha ? ` (${formatFecha(obra.cierre_bps_fecha)})` : ''}`],
  ]
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 16 }}>
      {obra.descripcion && <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{obra.descripcion}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px 18px' }}>
        {filas.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      {obra.nota && <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}><strong>Nota:</strong> {obra.nota}</div>}
      <button className="btn-outline btn-sm" style={{ marginTop: 16 }} onClick={onEditar}><Pencil size={13} /> Editar datos</button>
    </div>
  )
}
