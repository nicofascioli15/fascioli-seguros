'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Pencil, Phone, Mail, MessageCircle, Landmark, Copy, Check, Loader2, Building2, ChevronRight, AlertTriangle, ShieldCheck, User, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import { fetchObrasCompletas, resumenEmpresa, mismaEmpresa, type ObraCompleta } from '@/lib/obrasData'
import { formatMonto, formatFecha } from '@/lib/obrasConfig'
import { cuentasDe, textoCuenta, monedaTexto, numeroWhatsapp, type CuentaEmpresa } from '@/lib/cuentasEmpresa'
import { Barra } from '@/components/obras/ui'
import EmpresaModal, { type EmpresaObra } from '@/components/obras/EmpresaModal'
import ObraModal from '@/components/obras/ObraModal'

// Ficha de una empresa: contacto y cuentas en grande, y todo lo que tenemos pendiente con ella.
export default function EmpresaFichaPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()
  const [empresa, setEmpresa] = useState<EmpresaObra | null | undefined>(undefined)
  const [obras, setObras] = useState<ObraCompleta[]>([])
  const [editando, setEditando] = useState(false)
  const [nuevaObra, setNuevaObra] = useState(false)
  const [verCerradas, setVerCerradas] = useState(false)

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const { data: emp } = await supabase.from('obras_empresas').select('*').eq('id', id).maybeSingle()
    setEmpresa(emp || null)
    if (emp) {
      const todas = await fetchObrasCompletas(supabase)
      setObras(todas.filter(o => mismaEmpresa(o.empresa, emp.nombre)))
    }
  }

  if (empresa === undefined) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={24} className="spin" /></div>
  if (empresa === null) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>No se encontró la empresa</div>
      <Link href="/obras/empresas" className="btn-outline">Volver a Empresas</Link>
    </div>
  )

  const r = resumenEmpresa(obras)
  const cuentas = cuentasDe(empresa)
  const abiertas = obras.filter(o => !o.cerrada)
  const cerradas = obras.filter(o => o.cerrada)

  return (
    <div>
      <Link href="/obras/empresas" className="btn-outline btn-sm" style={{ marginBottom: 14, display: 'inline-flex' }}><ArrowLeft size={13} /> Empresas</Link>

      {/* Encabezado */}
      <div style={{ background: 'var(--navy)', color: 'white', borderRadius: 16, padding: '22px 24px', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 15, background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Briefcase size={26} color="#E2C47A" /></div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{empresa.nombre}</div>
          <div style={{ fontSize: 13, color: '#B8C5D6', marginTop: 5 }}>{empresa.rut ? `RUT ${empresa.rut}` : 'Sin RUT cargado'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline btn-sm" style={{ background: 'rgba(226,196,122,.15)', color: '#E2C47A', borderColor: 'rgba(226,196,122,.4)' }} onClick={() => setNuevaObra(true)}><Plus size={13} /> Nueva obra con esta empresa</button>
          <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={() => setEditando(true)}><Pencil size={13} /> Editar</button>
        </div>
      </div>

      {/* Números */}
      <div className="empf-kpis">
        <Kpi label="Le debemos" valor={r.saldo.length ? r.saldo.map(s => formatMonto(s.monto, s.moneda)).join(' · ') : '—'} sub={r.saldo.length ? 'saldo de sus obras abiertas' : 'sin saldo pendiente'} color={r.saldo.length ? 'var(--text-main)' : 'var(--text-muted)'} />
        <Kpi label="Le pagamos" valor={r.pagado.length ? r.pagado.map(s => formatMonto(s.monto, s.moneda)).join(' · ') : '—'} sub="en todas sus obras" />
        <Kpi label="Obras" valor={`${r.abiertas} abierta${r.abiertas === 1 ? '' : 's'}`} sub={`${r.total} en total`} />
        <Kpi label="Pagos atrasados" valor={String(r.atrasados)} sub={r.atrasados ? 'revisá las obras marcadas' : 'todo al día'} color={r.atrasados ? 'var(--danger)' : '#2E9668'} />
        <Kpi label="Garantías vigentes" valor={String(r.garantiasVigentes)} sub="obras todavía en garantía" />
      </div>

      <div className="empf-cols">
        {/* Contacto + cuentas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Seccion titulo="Contacto">
            {empresa.contacto && <Fila icon={<User size={16} />} texto={empresa.contacto} />}
            {empresa.tel ? (
              <>
                <Fila icon={<Phone size={16} />} texto={empresa.tel} />
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <a href={`tel:${empresa.tel.replace(/[^\d+]/g, '')}`} className="btn-outline btn-sm" style={{ textDecoration: 'none' }}><Phone size={13} /> Llamar</a>
                  <a href={`https://wa.me/${numeroWhatsapp(empresa.tel)}`} target="_blank" rel="noreferrer" className="btn-outline btn-sm" style={{ textDecoration: 'none', color: '#1DA851', borderColor: '#25D366' }}><MessageCircle size={13} /> WhatsApp</a>
                </div>
              </>
            ) : null}
            {empresa.email && <Fila icon={<Mail size={16} />} texto={<a href={`mailto:${empresa.email}`} style={{ color: 'var(--text-main)' }}>{empresa.email}</a>} />}
            {!empresa.contacto && !empresa.tel && !empresa.email && <Vacio texto="Sin datos de contacto." onClick={() => setEditando(true)} />}
          </Seccion>

          <Seccion titulo="Cuentas bancarias">
            {cuentas.length ? cuentas.map((c, i) => <CuentaGrande key={i} c={c} empresa={empresa.nombre} />) : <Vacio texto="Sin cuentas cargadas." onClick={() => setEditando(true)} />}
          </Seccion>
        </div>

        {/* Obras */}
        <Seccion titulo={`Obras abiertas (${abiertas.length})`}>
          {abiertas.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tiene obras abiertas.</div>
            : abiertas.map(o => <ObraFila key={o.id} o={o} onClick={() => router.push(`/obras/${o.id}`)} />)}
          {cerradas.length > 0 && (
            <>
              <button className="btn-outline btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={() => setVerCerradas(v => !v)}>
                {verCerradas ? 'Ocultar' : 'Ver'} obras cerradas ({cerradas.length})
              </button>
              {verCerradas && cerradas.map(o => <ObraFila key={o.id} o={o} onClick={() => router.push(`/obras/${o.id}`)} />)}
            </>
          )}
        </Seccion>
      </div>

      {editando && <EmpresaModal empresa={empresa} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); cargar() }} />}
      {nuevaObra && <ObraModal empresaInicial={empresa.nombre} onClose={() => setNuevaObra(false)} onSaved={oid => { setNuevaObra(false); router.push(`/obras/${oid}`) }} />}

      <style>{`
        .empf-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
        @media (max-width: 1100px) { .empf-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .empf-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .empf-cols { display: grid; grid-template-columns: minmax(300px, 1fr) minmax(0, 1.6fr); gap: 14px; align-items: start; }
        @media (max-width: 900px) { .empf-cols { grid-template-columns: 1fr; } }
        .empf-obra { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-soft); border-radius: 11px; cursor: pointer; background: var(--bg-card); transition: border-color .15s, transform .15s; }
        .empf-obra:hover { border-color: var(--gold); transform: translateX(2px); }
      `}</style>
    </div>
  )
}

function Kpi({ label, valor, sub, color }: { label: string; valor: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{label}</div>
      <div title={valor} style={{ fontSize: 19, fontWeight: 800, color: color || 'var(--text-main)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{titulo}</div>
      {children}
    </div>
  )
}

function Fila({ icon, texto }: { icon: React.ReactNode; texto: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 600 }}><span style={{ color: 'var(--gold)', display: 'flex' }}>{icon}</span>{texto}</div>
}

function Vacio({ texto, onClick }: { texto: string; onClick: () => void }) {
  return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{texto} <button onClick={onClick} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 13 }}>Cargar</button></div>
}

function CuentaGrande({ c, empresa }: { c: CuentaEmpresa; empresa: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoCuenta(c, empresa))
      setCopiado(true); showToast('Datos de la cuenta copiados', 'success')
      setTimeout(() => setCopiado(false), 1600)
    } catch { showToast('No se pudo copiar', 'error') }
  }
  return (
    <div style={{ border: '1px solid var(--border-soft)', borderRadius: 12, padding: '12px 14px', background: 'var(--bg-card-alt)', display: 'flex', gap: 12, alignItems: 'center' }}>
      <Landmark size={20} color="var(--gold)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 15 }}>{c.banco || 'Banco sin indicar'}</strong>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 5, background: 'var(--gold-pale)', color: 'var(--gold)' }}>{monedaTexto(c.moneda)}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '.03em', fontVariantNumeric: 'tabular-nums', marginTop: 2, wordBreak: 'break-all' }}>{c.nro_cuenta || '—'}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Titular: {c.titular || empresa}</div>
      </div>
      {c.nro_cuenta && (
        <button className="btn-outline btn-sm" onClick={copiar} style={copiado ? { color: '#16A34A', borderColor: '#86EFAC' } : undefined}>
          {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Copiar'}
        </button>
      )}
    </div>
  )
}

function ObraFila({ o, onClick }: { o: ObraCompleta; onClick: () => void }) {
  const base = o.precio_total ?? o.rp.totalPlan
  const prox = o.rp.proximoPago
  return (
    <div className="empf-obra" onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14.5 }}>{o.titulo}</strong>
          <span className={`badge ${o.situacion.cls}`}>{o.situacion.label}</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}><Building2 size={12} /> {o.edificio}</div>
        {base > 0 && (
          <div style={{ marginTop: 8 }}>
            <Barra pct={o.rp.pctPagado} color={o.rp.vencidos.length ? 'var(--danger)' : o.cerrada ? '#2E9668' : 'var(--gold)'} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginTop: 4, flexWrap: 'wrap' }}>
              <span>Pagado {formatMonto(o.rp.totalPagado, o.moneda)} de {formatMonto(base, o.moneda)}</span>
              {!o.cerrada && <span>Saldo <strong style={{ color: 'var(--text-main)' }}>{formatMonto(o.rp.saldo, o.moneda)}</strong></span>}
            </div>
          </div>
        )}
        {!o.cerrada && prox && (
          <div style={{ fontSize: 12, marginTop: 4, color: o.rp.vencidos.length ? '#B91C1C' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            {o.rp.vencidos.length ? <AlertTriangle size={12} /> : null}
            Próximo pago: {prox.concepto} · {formatMonto(prox.monto, o.moneda)} · {prox.fecha_prevista ? formatFecha(prox.fecha_prevista) : (prox.condicion || 'sin fecha')}
          </div>
        )}
        {o.cerrada && o.garantia.estado === 'en_garantia' && (
          <div style={{ fontSize: 12, marginTop: 4, color: '#2E9668', display: 'flex', alignItems: 'center', gap: 5 }}><ShieldCheck size={12} /> En garantía hasta {formatFecha(o.garantia.hasta)}</div>
        )}
      </div>
      <ChevronRight size={18} color="var(--text-muted)" />
    </div>
  )
}
