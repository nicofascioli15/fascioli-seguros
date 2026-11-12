'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Lock, Unlock, Vote, Eye, EyeOff, Users, FileSignature, Play, CheckCircle2, XCircle, ArrowDownUp, Check, X, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Pantalla, ResultadoCard, BotonesVoto, type ResultadoMocion } from '@/components/asambleas/Kiosco'
import { fetchAsamblea, cerrarVotacion, type AsambleaCompleta } from '@/lib/asambleasData'
import { calcularResultado, votante, claveVotante, votoLabel, mayoriaLabel, ordenUnidad, type Mocion, type Voto, type UnidadAsamblea } from '@/lib/asambleas'

// ============================================================================
// MODO SALA (administración, pensado para tablet): control en vivo de la votación.
// Tarjeta por unidad con su voto o "SIN VOTAR", contadores grandes y botones para
// abrir / cerrar cada votación. Se actualiza sola cada 2 segundos.
// ============================================================================
export default function SalaControlPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()
  const [d, setD] = useState<AsambleaCompleta | null | undefined>(undefined)
  const [ocultarVotos, setOcultarVotos] = useState(false)
  const [sinVotarPrimero, setSinVotarPrimero] = useState(true)
  const [confirm, setConfirm] = useState<null | { titulo: string; mensaje: string; label: string; accion: () => Promise<void> }>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [votarPor, setVotarPor] = useState<UnidadAsamblea | null>(null)   // unidad tocada en la sala para votar en esta tablet

  async function cargar() { setD(await fetchAsamblea(supabase, id)) }
  useEffect(() => { cargar() }, [id])
  useEffect(() => { const t = setInterval(cargar, 2000); return () => clearInterval(t) }, [id])
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev } }, [])

  const votando = d?.mociones.find(m => m.estado === 'votando') || null
  const votoDe = useMemo(() => new Map((d?.votos || []).filter(v => v.mocion_id === votando?.id).map(v => [v.unidad_id, v.voto])), [d, votando?.id])

  if (d === undefined) return <Pantalla><Centro><Loader2 size={34} className="spin" /></Centro></Pantalla>
  if (d === null) return <Pantalla><Centro><button className="kz-mini" onClick={() => router.push('/asambleas')}>Volver</button></Centro></Pantalla>

  const a = d.asamblea
  const conCoef = a.modo_conteo !== 'unidad'
  const etiqueta = `${d.edificio}`

  function resultadoDe(m: Mocion): ResultadoMocion {
    const vs = d!.votos.filter(v => v.mocion_id === m.id)
    const coef = (uid: string) => Number(d!.unidades.find(u => u.id === uid)?.coeficiente || 0)
    const suma = (voto: string) => vs.filter(v => v.voto === voto).reduce((s, v) => s + coef(v.unidad_id), 0)
    return {
      id: m.id, orden: m.orden, titulo: m.titulo, descripcion: m.descripcion, estado: m.estado, aprobada: m.aprobada,
      si: vs.filter(v => v.voto === 'si').length, no: vs.filter(v => v.voto === 'no').length, abstencion: vs.filter(v => v.voto === 'abstencion').length,
      si_coef: suma('si'), no_coef: suma('no'), abstencion_coef: suma('abstencion'), acreditadas: d!.unidades.length,
    }
  }

  async function abrir(m: Mocion) {
    if (d!.unidades.length === 0) { showToast('Todavía no hay unidades registradas', 'error'); return }
    const { error } = await supabase.from('asamblea_mociones').update({ estado: 'votando', aprobada: null, resultado: null }).eq('id', m.id)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'asamblea_mociones', registroId: m.id, descripcion: `Votación abierta (modo sala): "${m.titulo}" — ${etiqueta}`, datosAntes: { estado: m.estado }, datosDespues: { estado: 'votando' } })
    await cargar()
  }

  async function cerrar(m: Mocion) {
    const r = await cerrarVotacion(supabase, d!, m)
    if (r.error) showToast(r.error, 'error')
    await cargar()
  }

  const ejecutar = async () => { if (!confirm) return; setTrabajando(true); try { await confirm.accion() } finally { setTrabajando(false); setConfirm(null) } }

  const ultimaCerrada = [...d.mociones].filter(m => m.estado === 'cerrada').sort((x, y) => y.orden - x.orden)[0]
  const pendientes = d.mociones.filter(m => m.estado === 'pendiente')

  return (
    <Pantalla>
      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526', flexWrap: 'wrap' }}>
        <button onClick={() => router.push(`/asambleas/${id}`)} className="kz-mini"><ArrowLeft size={15} /> Volver</button>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Modo sala · control</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Asamblea {d.edificio}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#B8C5D6' }}>
          <Users size={17} /> <strong style={{ color: 'white', fontSize: 20 }}>{d.unidades.length}</strong>{a.total_unidades ? ` / ${a.total_unidades}` : ''} unidades presentes
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 40px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          {votando ? (
            <Votacion m={votando} d={d} votoDe={votoDe} conCoef={conCoef} ocultar={ocultarVotos} sinVotarPrimero={sinVotarPrimero} onVotarUnidad={u => setVotarPor(u)}
              setOcultar={setOcultarVotos} setSinVotarPrimero={setSinVotarPrimero}
              onCerrar={() => {
                const faltan = d.unidades.filter(u => !votoDe.has(u.id)).length
                setConfirm({ titulo: `¿Cerrar la votación de "${votando.titulo}"?`, mensaje: faltan ? `${faltan} unidad${faltan > 1 ? 'es' : ''} todavía no votaron. Se cierra con los votos que hay.` : 'Votaron todas las unidades.', label: 'Cerrar votación', accion: () => cerrar(votando) })
              }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {ultimaCerrada && (
                <div style={{ maxWidth: 820, width: '100%', margin: '0 auto' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Último resultado</div>
                  <ResultadoCard r={resultadoDe(ultimaCerrada)} conCoef={conCoef} grande />
                </div>
              )}
              <div style={{ maxWidth: 820, width: '100%', margin: '0 auto' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Mociones</div>
                {d.mociones.length === 0 && <div style={{ color: '#8A9BB5', fontSize: 16 }}>No hay mociones cargadas. Agregalas desde la ficha de la asamblea.</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...d.mociones].sort((x, y) => x.orden - y.orden).map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '14px 16px', flexWrap: 'wrap' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(226,196,122,.15)', color: '#E2C47A', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{m.orden}</div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{m.titulo}</div>
                        <div style={{ fontSize: 13, color: '#8A9BB5' }}>{mayoriaLabel(m.mayoria)}</div>
                      </div>
                      {m.estado === 'cerrada' && (m.aprobada
                        ? <span style={{ color: '#4ADE80', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={18} /> Aprobada</span>
                        : <span style={{ color: '#F87171', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={18} /> Rechazada</span>)}
                      {a.estado === 'abierta' && (m.estado === 'pendiente'
                        ? <button className="kz-confirmar" style={{ width: 'auto', marginTop: 0, padding: '14px 22px', fontSize: 17 }} onClick={() => abrir(m)}><Play size={20} /> Abrir votación</button>
                        : <button className="kz-mini" onClick={() => setConfirm({ titulo: `¿Reabrir "${m.titulo}"?`, mensaje: 'Los votos que ya están se mantienen y cada uno puede cambiar el suyo.', label: 'Reabrir', accion: () => abrir(m) })}><Unlock size={14} /> Reabrir</button>)}
                    </div>
                  ))}
                </div>
                {pendientes.length === 0 && d.mociones.length > 0 && <div style={{ color: '#8A9BB5', fontSize: 15, marginTop: 12 }}>Ya se votaron todas las mociones.</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {votarPor && votando && (
        <VotarEnSala m={votando} d={d} unidad={votarPor} votoDe={votoDe} etiqueta={etiqueta}
          onCerrar={() => setVotarPor(null)} onListo={async () => { setVotarPor(null); await cargar() }} />
      )}

      <ConfirmDialog open={!!confirm} title={confirm?.titulo || ''} message={confirm?.mensaje} confirmLabel={confirm?.label} tone="neutral" loading={trabajando} onConfirm={ejecutar} onCancel={() => setConfirm(null)} />
      <style>{`
        .sala-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .sala-card { all: unset; box-sizing: border-box; cursor: pointer; text-align: left; color: white; border-style: solid; border-radius: 14px; padding: 12px 12px 11px; border: 2px solid; min-height: 92px; display: flex; flex-direction: column; justify-content: space-between; transition: background .3s, border-color .3s; }
        @keyframes salaPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.0) } 50% { box-shadow: 0 0 0 4px rgba(245,158,11,.25) } }
      `}</style>
    </Pantalla>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }}><div>{children}</div></div>
}

const ESTILO: Record<string, { label: string; bg: string; borde: string; color: string }> = {
  si: { label: 'A FAVOR', bg: 'rgba(22,163,74,.18)', borde: '#22C55E', color: '#4ADE80' },
  no: { label: 'EN CONTRA', bg: 'rgba(220,38,38,.18)', borde: '#EF4444', color: '#F87171' },
  abstencion: { label: 'ABSTENCIÓN', bg: 'rgba(148,163,184,.16)', borde: '#94A3B8', color: '#CBD5E1' },
  voto: { label: 'VOTÓ', bg: 'rgba(59,130,246,.16)', borde: '#60A5FA', color: '#93C5FD' },
  sin: { label: 'SIN VOTAR', bg: 'rgba(245,158,11,.10)', borde: '#F59E0B', color: '#FBBF24' },
}

function Votacion({ m, d, votoDe, conCoef, ocultar, sinVotarPrimero, setOcultar, setSinVotarPrimero, onCerrar, onVotarUnidad }: {
  m: Mocion; d: AsambleaCompleta; votoDe: Map<string, string>; conCoef: boolean; ocultar: boolean; sinVotarPrimero: boolean
  setOcultar: (v: boolean) => void; setSinVotarPrimero: (v: boolean) => void; onCerrar: () => void; onVotarUnidad: (u: UnidadAsamblea) => void
}) {
  const r = calcularResultado(d.asamblea, m, d.unidades, d.votos.filter(v => v.mocion_id === m.id))
  const c = r.usaUnidades ? r.unidades : r.coeficiente
  const nSin = d.unidades.filter(u => !votoDe.has(u.id)).length
  const unidades = [...d.unidades].sort((a, b) => sinVotarPrimero ? (Number(votoDe.has(a.id)) - Number(votoDe.has(b.id))) || ordenUnidad(a, b) : ordenUnidad(a, b))
  const contadores = [
    { k: 'si', n: r.unidades.si, cf: r.coeficiente.si },
    { k: 'no', n: r.unidades.no, cf: r.coeficiente.no },
    { k: 'abstencion', n: r.unidades.abstencion, cf: r.coeficiente.abstencion },
    { k: 'sin', n: nSin, cf: r.coeficiente.sinVotar },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, color: '#E2C47A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6 }}><Vote size={15} /> Votando · moción {m.orden}</div>
          <div style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, lineHeight: 1.15, marginTop: 4 }}>{m.titulo}</div>
          <div style={{ fontSize: 14, color: '#B8C5D6', marginTop: 6 }}>{mayoriaLabel(m.mayoria)} · hace falta {r.necesario}</div>
        </div>
        <button className="kz-confirmar" style={{ width: 'auto', marginTop: 0, padding: '16px 24px', fontSize: 18, background: '#B91C1C' }} onClick={onCerrar}><Lock size={20} /> Cerrar votación</button>
      </div>

      {/* Contadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {contadores.map(x => {
          const st = ESTILO[x.k]
          return (
            <div key={x.k} style={{ background: st.bg, border: `2px solid ${st.borde}`, borderRadius: 16, padding: '14px 16px', animation: x.k === 'sin' && x.n > 0 ? 'salaPulso 1.8s infinite' : undefined }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: st.color, letterSpacing: '.06em' }}>{st.label}</div>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{ocultar && x.k !== 'sin' ? '•' : x.n}</div>
              {conCoef && !(ocultar && x.k !== 'sin') && <div style={{ fontSize: 13, color: '#B8C5D6' }}>{Math.round(x.cf * 100) / 100}% coef.</div>}
            </div>
          )
        })}
      </div>

      {/* Barra */}
      {!ocultar && (
        <div style={{ display: 'flex', height: 14, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,.08)' }}>
          {[['si', '#22C55E'], ['no', '#EF4444'], ['abstencion', '#94A3B8'], ['sinVotar', 'rgba(245,158,11,.5)']].map(([k, col]) => {
            const tot = c.si + c.no + c.abstencion + c.sinVotar || 1
            const v = (c as any)[k] as number
            return v > 0 ? <div key={k} style={{ width: `${(v / tot) * 100}%`, background: col, transition: 'width .4s' }} /> : null
          })}
        </div>
      )}

      {/* Opciones de vista */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="kz-mini" onClick={() => setOcultar(!ocultar)}>{ocultar ? <Eye size={14} /> : <EyeOff size={14} />} {ocultar ? 'Mostrar votos' : 'Ocultar votos (solo quién votó)'}</button>
        <button className="kz-mini" onClick={() => setSinVotarPrimero(!sinVotarPrimero)}><ArrowDownUp size={14} /> {sinVotarPrimero ? 'Ordenar por unidad' : 'Sin votar primero'}</button>
        {!ocultar && <span style={{ fontSize: 14, fontWeight: 700, color: r.aprobada ? '#4ADE80' : '#F87171', marginLeft: 'auto' }}>Por ahora: {r.aprobada ? 'se aprueba' : 'no alcanza'}</span>}
      </div>

      <div style={{ fontSize: 14, color: '#B8C5D6' }}><strong style={{ color: 'white' }}>Tocá una unidad para votar en esta tablet.</strong> Se puede ir pasando la tablet de mano en mano, además de votar desde el celular.</div>

      {/* Tarjeta por unidad */}
      <div className="sala-grid">
        {unidades.map(u => {
          const v = votoDe.get(u.id)
          const st = !v ? ESTILO.sin : ocultar ? ESTILO.voto : ESTILO[v]
          return (
            <button key={u.id} type="button" className="sala-card" onClick={() => onVotarUnidad(u)} title="Tocá para votar en esta tablet" style={{ background: st.bg, borderColor: st.borde }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{u.unidad}</span>
                {u.por_poder && <FileSignature size={15} color="#E2C47A" />}
              </div>
              <div style={{ fontSize: 12, color: '#B8C5D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{votante(u)}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: st.color, letterSpacing: '.04em', marginTop: 4 }}>{st.label}</div>
            </button>
          )
        })}
      </div>
      {d.unidades.length === 0 && <div style={{ color: '#8A9BB5', textAlign: 'center', padding: 30 }}>No hay unidades registradas.</div>}
    </div>
  )
}

// Votar en la tablet de la sala: se toca la unidad, la persona elige y confirma, y vuelve a la sala.
// Si esa persona vota también por otras unidades (poderes), las vota juntas.
function VotarEnSala({ m, d, unidad, votoDe, etiqueta, onCerrar, onListo }: {
  m: Mocion; d: AsambleaCompleta; unidad: UnidadAsamblea; votoDe: Map<string, string>; etiqueta: string
  onCerrar: () => void; onListo: () => void
}) {
  const supabase = createClient()
  const clave = claveVotante(unidad)
  const suyas = d.unidades.filter(u => claveVotante(u) === clave).sort(ordenUnidad)
  const [eleccion, setEleccion] = useState<Record<string, Voto>>(() => {
    const x: Record<string, Voto> = {}
    suyas.forEach(u => { const v = votoDe.get(u.id); if (v) x[u.id] = v as Voto })
    return x
  })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const yaVoto = suyas.some(u => votoDe.has(u.id))

  async function confirmar() {
    if (suyas.some(u => !eleccion[u.id])) { showToast('Falta elegir el voto de alguna unidad', 'error'); return }
    setGuardando(true)
    const filas = suyas.map(u => ({ mocion_id: m.id, unidad_id: u.id, voto: eleccion[u.id] }))
    const { error } = await supabase.from('asamblea_votos').upsert(filas, { onConflict: 'mocion_id,unidad_id' })
    setGuardando(false)
    if (error) { showToast(`No se pudo guardar el voto: ${error.message}`, 'error'); return }
    await registrarAudit({ accion: 'crear', tabla: 'asamblea_votos', descripcion: `Votó en la sala ${votante(unidad)} (${suyas.map(u => `${u.unidad}: ${votoLabel(eleccion[u.id])}`).join(', ')}) en "${m.titulo}" — ${etiqueta}`, datosDespues: filas })
    setOk(true)
    setTimeout(onListo, 1400)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 345, background: 'rgba(10,21,38,.96)', display: 'flex', flexDirection: 'column', color: 'white' }}>
      {ok ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#16A34A', display: 'grid', placeItems: 'center', margin: '0 auto 20px', animation: 'kzPop .35s ease' }}><Check size={64} strokeWidth={3} /></div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>¡Voto registrado!</div>
            <div style={{ fontSize: 18, color: '#B8C5D6', marginTop: 6 }}>{votante(unidad)}</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <button className="kz-mini" onClick={onCerrar}><X size={15} /> Volver a la sala</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 6px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center' }}><User size={28} color="#E2C47A" /></div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{votante(unidad)}</div>
                <div style={{ fontSize: 15, color: '#B8C5D6' }}>Vota por {suyas.length === 1 ? 'la unidad' : `${suyas.length} unidades`} {suyas.map(u => u.unidad).join(', ')}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '14px 16px', margin: '14px 0 20px' }}>
              <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Se vota</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{m.titulo}</div>
              {m.descripcion && <div style={{ fontSize: 15, color: '#B8C5D6', marginTop: 6, whiteSpace: 'pre-wrap' }}>{m.descripcion}</div>}
            </div>
            {yaVoto && <div style={{ fontSize: 14, color: '#FBBF24', marginBottom: 12 }}>Ya había votado: si confirma, el voto se cambia.</div>}
            {suyas.length > 1 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: '#B8C5D6' }}>Lo mismo por todas sus unidades:</div>
                <BotonesVoto valor={suyas.every(u => eleccion[u.id] === eleccion[suyas[0].id]) ? eleccion[suyas[0].id] : undefined}
                  onVoto={v => { const x: Record<string, Voto> = {}; suyas.forEach(u => { x[u.id] = v }); setEleccion(x) }} grande />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suyas.map(u => (
                <div key={u.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>Unidad {u.unidad}</span>
                    {u.por_poder && <span className="kz-tag"><FileSignature size={13} /> Por poder</span>}
                  </div>
                  <BotonesVoto valor={eleccion[u.id]} onVoto={v => setEleccion(x => ({ ...x, [u.id]: v }))} grande={suyas.length === 1} />
                </div>
              ))}
            </div>
            <button className="kz-confirmar" onClick={confirmar} disabled={guardando || suyas.some(u => !eleccion[u.id])}>
              {guardando ? <Loader2 size={24} className="spin" /> : <><Check size={26} strokeWidth={3} /> Confirmar voto</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
