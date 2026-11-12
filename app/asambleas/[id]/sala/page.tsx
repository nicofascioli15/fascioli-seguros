'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Lock, Unlock, Vote, Eye, EyeOff, Users, FileSignature, Play, CheckCircle2, XCircle, ArrowDownUp, Check, X, User, Home, Search, PenLine, UserCheck, Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Pantalla, ResultadoCard, BotonesVoto, type ResultadoMocion } from '@/components/asambleas/Kiosco'
import { fetchAsamblea, cerrarVotacion, type AsambleaCompleta } from '@/lib/asambleasData'
import { traerPadron, type UnidadPadron } from '@/lib/padronImport'
import FirmaPad, { type FirmaPadRef } from '@/components/asambleas/FirmaPad'
import { calcularResultado, votante, claveVotante, votoLabel, mayoriaLabel, ordenUnidad, MAYORIAS, BASES, type Mocion, type Voto, type UnidadAsamblea, type Mayoria, type BaseMayoria } from '@/lib/asambleas'

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
  const [seccion, setSeccion] = useState<'registro' | 'votacion'>('registro')
  const [editMocion, setEditMocion] = useState<Mocion | 'nueva' | null>(null)

  async function cargar() { setD(await fetchAsamblea(supabase, id)) }
  useEffect(() => { cargar() }, [id])
  useEffect(() => { const t = setInterval(cargar, 2000); return () => clearInterval(t) }, [id])
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev } }, [])

  const votando = d?.mociones.find(m => m.estado === 'votando') || null
  // Cuando se abre una votación, la sala pasa sola a "Votaciones"
  useEffect(() => { if (votando?.id) setSeccion('votacion') }, [votando?.id])
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

  async function eliminarMocion(m: Mocion) {
    const { error } = await supabase.from('asamblea_mociones').delete().eq('id', m.id)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'asamblea_mociones', registroId: m.id, descripcion: `Moción eliminada (modo sala): "${m.titulo}" — ${etiqueta}`, datosAntes: m })
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

      {/* Secciones: todo se maneja desde acá (registro y votaciones) */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 18px', background: '#0A1526', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <button className={`kz-opcion ${seccion === 'registro' ? 'sel' : ''}`} style={{ flex: 'none', padding: '10px 18px', fontSize: 16 }} onClick={() => setSeccion('registro')}><UserCheck size={18} /> Bienvenida y registro</button>
        <button className={`kz-opcion ${seccion === 'votacion' ? 'sel' : ''}`} style={{ flex: 'none', padding: '10px 18px', fontSize: 16 }} onClick={() => setSeccion('votacion')}><Vote size={18} /> Votaciones{votando ? ' · votando' : ''}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 40px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          {seccion === 'registro' ? (
            a.estado === 'abierta' ? <SalaRegistro d={d} recargar={cargar} /> : <div style={{ textAlign: 'center', color: '#8A9BB5', fontSize: 18, padding: 40 }}>La asamblea está cerrada.</div>
          ) : votando ? (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>Mociones</div>
                  {a.estado === 'abierta' && <button className="kz-mini" style={{ background: 'rgba(226,196,122,.16)', color: '#E2C47A', borderColor: 'rgba(226,196,122,.45)', fontSize: 15, padding: '11px 16px' }} onClick={() => setEditMocion('nueva')}><Plus size={16} /> Nueva moción</button>}
                </div>
                {d.mociones.length === 0 && <div style={{ color: '#8A9BB5', fontSize: 16 }}>Todavía no hay mociones. Tocá "Nueva moción" para cargar cada tema que se vota.</div>}
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
                      {a.estado === 'abierta' && m.estado === 'pendiente' && <>
                        <button className="kz-mini" title="Editar" onClick={() => setEditMocion(m)}><Pencil size={15} /></button>
                        <button className="kz-mini" title="Eliminar" style={{ color: '#F87171' }} onClick={() => setConfirm({ titulo: `¿Eliminar "${m.titulo}"?`, mensaje: 'Se borra la moción.', label: 'Eliminar', accion: () => eliminarMocion(m) })}><Trash2 size={15} /></button>
                      </>}
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

      {editMocion && <MocionSala d={d} mocion={editMocion === 'nueva' ? null : editMocion} etiqueta={etiqueta} onCerrar={() => setEditMocion(null)} onListo={async () => { setEditMocion(null); await cargar() }} />}

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

// ── Bienvenida y registro en la tablet de la sala (propietario o con poder, con firma) ──
type Persona = { nombre: string; apellido: string; tel: string; firma: string | null }
function SalaRegistro({ d, recargar }: { d: AsambleaCompleta; recargar: () => Promise<void> }) {
  const supabase = createClient()
  const [padron, setPadron] = useState<UnidadPadron[]>([])
  const [torres, setTorres] = useState<{ codigo: string; nombre: string | null }[]>([])
  const [cargado, setCargado] = useState(false)
  const [torreSel, setTorreSel] = useState('')
  const [buscar, setBuscar] = useState('')
  const [paso, setPaso] = useState<'lista' | 'form' | 'ok'>('lista')
  const [sel, setSel] = useState<UnidadPadron | null>(null)
  const [modo, setModo] = useState<'propietario' | 'poder'>('propietario')
  const [yo, setYo] = useState({ nombre: '', apellido: '', tel: '' })
  const [firmaReuso, setFirmaReuso] = useState<string | null>(null)
  const [tieneFirma, setTieneFirma] = useState(false)
  const [preset, setPreset] = useState<Persona | null>(null)
  const [ultimo, setUltimo] = useState<{ unidad: string; persona: Persona } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const pad = useRef<FirmaPadRef>(null)

  useEffect(() => {
    traerPadron(supabase, d.asamblea.edificio_id).then(p => {
      setPadron(p.unidades); setTorres(p.torres); setCargado(true)
      if (p.torres.length && !p.unidades.some(u => !u.torre)) setTorreSel(p.torres[0].codigo)
    }).catch(() => setCargado(true))
  }, [d.asamblea.edificio_id])

  const registradas = new Set(d.unidades.map(u => u.unidad.toLowerCase()))
  if (!cargado) return <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="spin" /></div>
  if (!padron.length) return <div style={{ textAlign: 'center', color: '#B8C5D6', fontSize: 17, padding: 40 }}>Este edificio no tiene las unidades cargadas (Asambleas → Edificios y unidades).</div>

  const q = buscar.trim().toLowerCase()
  const visibles = padron.filter(p => (q ? true : p.torre === torreSel) && (!q || p.label.toLowerCase().includes(q) || p.num.toLowerCase().includes(q)))
  const completo = (p: { nombre: string; apellido: string }) => `${p.nombre.trim()} ${p.apellido.trim()}`.trim()

  function elegir(p: UnidadPadron) {
    setSel(p); setTieneFirma(false)
    if (preset) { setModo('poder'); setYo({ nombre: preset.nombre, apellido: preset.apellido, tel: preset.tel }); setFirmaReuso(preset.firma) }
    else { setModo('propietario'); setYo({ nombre: '', apellido: '', tel: '' }); setFirmaReuso(null) }
    setPaso('form')
  }

  async function confirmar() {
    if (!sel) return
    if (!yo.nombre.trim() || !yo.apellido.trim()) { showToast('Poné nombre y apellido', 'error'); return }
    if (yo.tel.replace(/\D/g, '').length < 6) { showToast('Poné un teléfono', 'error'); return }
    if (!firmaReuso && (pad.current?.vacia() ?? true)) { showToast('Falta la firma', 'error'); return }
    setGuardando(true)
    let firma = firmaReuso
    if (!firma) {
      const blob = await pad.current?.png()
      firma = blob ? await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob) }) : null
    }
    const nombre = completo(yo), poder = modo === 'poder'
    const fila = {
      asamblea_id: d.asamblea.id, unidad: sel.label, coeficiente: sel.coeficiente, por_poder: poder,
      propietario: poder ? null : nombre, propietario_tel: poder ? null : yo.tel.trim(),
      apoderado: poder ? nombre : null, apoderado_tel: poder ? yo.tel.trim() : null,
      firma_data: firma, firmo: true,
    }
    const { data, error } = await supabase.from('asamblea_unidades').insert([fila]).select('id').single()
    setGuardando(false)
    if (error) { showToast(error.message.includes('duplicate') ? `La unidad ${sel.label} ya está registrada` : error.message, 'error'); await recargar(); setPaso('lista'); return }
    await registrarAudit({ accion: 'crear', tabla: 'asamblea_unidades', registroId: data?.id, descripcion: `Unidad ${sel.label} registrada en el modo sala${poder ? ` por poder (${nombre})` : ` (${nombre})`} — ${d.edificio}` })
    setUltimo({ unidad: sel.label, persona: { ...yo, firma } })
    setPaso('ok'); setBuscar('')
    recargar()
  }

  function terminar() { setPreset(null); setUltimo(null); setSel(null); setPaso('lista') }

  if (paso === 'ok' && ultimo) return (
    <div style={{ textAlign: 'center', padding: '30px 10px' }}>
      <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#16A34A', display: 'grid', placeItems: 'center', margin: '0 auto 20px', animation: 'kzPop .35s ease' }}><Check size={60} strokeWidth={3} /></div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>¡Unidad {ultimo.unidad} registrada!</div>
      <div style={{ fontSize: 17, color: '#B8C5D6', marginTop: 6 }}>{completo(ultimo.persona)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, margin: '28px auto 0' }}>
        <button className="kz-confirmar" style={{ marginTop: 0, background: 'rgba(226,196,122,.16)', color: '#E2C47A', border: '2px solid #E2C47A', fontSize: 19 }} onClick={() => { setPreset(ultimo.persona); setPaso('lista') }}><FileSignature size={22} /> Traigo poder de otra unidad</button>
        <button className="kz-confirmar" style={{ marginTop: 0, fontSize: 19 }} onClick={terminar}><Check size={22} strokeWidth={3} /> Listo, paso la tablet</button>
      </div>
    </div>
  )

  if (paso === 'form' && sel) return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button className="kz-mini" onClick={() => setPaso('lista')}><ArrowLeft size={15} /> Elegir otra unidad</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 20px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center', color: '#E2C47A', fontWeight: 800, fontSize: 20 }}>{sel.num}</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>Unidad {sel.num}{sel.torre ? <span style={{ fontSize: 16, color: '#8A9BB5' }}> · {torres.find(t => t.codigo === sel.torre)?.nombre || sel.torre}</span> : null}</div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <button className={`kz-opcion ${modo === 'propietario' ? 'sel' : ''}`} onClick={() => setModo('propietario')}><Home size={22} /> Soy el propietario</button>
        <button className={`kz-opcion ${modo === 'poder' ? 'sel' : ''}`} onClick={() => setModo('poder')}><FileSignature size={22} /> Vengo con poder</button>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{modo === 'poder' ? 'Tus datos (firmás y votás por esta unidad)' : 'Tus datos'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label className="kz-label">Nombre</label><input className="kz-input" value={yo.nombre} onChange={ev => setYo(y => ({ ...y, nombre: ev.target.value }))} autoComplete="off" /></div>
        <div><label className="kz-label">Apellido</label><input className="kz-input" value={yo.apellido} onChange={ev => setYo(y => ({ ...y, apellido: ev.target.value }))} autoComplete="off" /></div>
        <div style={{ gridColumn: '1 / -1' }}><label className="kz-label">Teléfono</label><input className="kz-input" inputMode="tel" value={yo.tel} onChange={ev => setYo(y => ({ ...y, tel: ev.target.value }))} placeholder="Ej: 099 123 456" autoComplete="off" /></div>
      </div>
      <div style={{ marginTop: 20 }}>
        <label className="kz-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PenLine size={14} /> Firma</label>
        {firmaReuso ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(22,163,74,.12)', border: '1px solid rgba(74,222,128,.35)', borderRadius: 14, padding: '14px 16px', flexWrap: 'wrap' }}>
            <Check size={22} color="#4ADE80" /><div style={{ flex: 1, fontSize: 16 }}>Se usa la misma firma que ya hiciste</div>
            <button className="kz-mini" onClick={() => { setFirmaReuso(null); setTieneFirma(false) }}><PenLine size={14} /> Firmar de nuevo</button>
          </div>
        ) : <FirmaPad ref={pad} onCambio={setTieneFirma} />}
      </div>
      <button className="kz-confirmar" onClick={confirmar} disabled={guardando || !yo.nombre.trim() || !yo.apellido.trim() || !yo.tel.trim() || (!firmaReuso && !tieneFirma)}>
        {guardando ? <Loader2 size={24} className="spin" /> : <><Check size={26} strokeWidth={3} /> Registrarme</>}
      </button>
    </div>
  )

  return (
    <div>
      {preset ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(226,196,122,.12)', border: '1px solid rgba(226,196,122,.4)', borderRadius: 14, padding: '12px 16px', marginBottom: 18, flexWrap: 'wrap' }}>
          <FileSignature size={22} color="#E2C47A" /><div style={{ flex: 1, fontSize: 17 }}><strong>{completo(preset)}</strong>: tocá la unidad de la que traés el poder</div>
          <button className="kz-mini" onClick={terminar}><X size={14} /> Terminé</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>Bienvenido a la asamblea</div>
          <div style={{ fontSize: 17, color: '#B8C5D6', marginTop: 6 }}>Tocá tu apartamento para registrarte. Si venís con poder, tocá el apartamento del que traés el poder.</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        {torres.length > 0 && !q && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {padron.some(p => !p.torre) && <button className={`kz-opcion ${torreSel === '' ? 'sel' : ''}`} style={{ flex: 'none', padding: '10px 16px', fontSize: 15 }} onClick={() => setTorreSel('')}>Sin torre</button>}
            {torres.map(t => <button key={t.codigo} className={`kz-opcion ${torreSel === t.codigo ? 'sel' : ''}`} style={{ flex: 'none', padding: '10px 16px', fontSize: 15 }} onClick={() => setTorreSel(t.codigo)}>{t.nombre || t.codigo}</button>)}
          </div>
        )}
        <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
          <input value={buscar} onChange={ev => setBuscar(ev.target.value)} placeholder="Buscar apto"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 42px', fontSize: 16, borderRadius: 12, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: 'white', outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>
      <div className="sala-grid">
        {visibles.map(p => {
          const listo = registradas.has(p.label.toLowerCase())
          return (
            <button key={p.label} disabled={listo} onClick={() => elegir(p)} className={`kz-persona ${listo ? 'listo' : ''}`} style={{ minHeight: 84, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{p.num}</span>
                {listo && <span className="kz-ok"><Check size={16} strokeWidth={3} /></span>}
              </div>
              <div style={{ fontSize: 12.5, color: listo ? '#4ADE80' : '#8A9BB5', marginTop: 4 }}>{listo ? 'Registrada' : 'Tocá para registrarte'}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Nueva / editar moción desde la tablet (de parado, sin computadora) ──
function MocionSala({ d, mocion, etiqueta, onCerrar, onListo }: { d: AsambleaCompleta; mocion: Mocion | null; etiqueta: string; onCerrar: () => void; onListo: () => void }) {
  const supabase = createClient()
  const [f, setF] = useState({ titulo: mocion?.titulo || '', descripcion: mocion?.descripcion || '', mayoria: (mocion?.mayoria || 'simple') as Mayoria, base: (mocion?.base || 'presentes') as BaseMayoria })
  const [guardando, setGuardando] = useState(false)
  const ayudaMay = MAYORIAS.find(x => x.value === f.mayoria)?.ayuda

  async function guardar() {
    if (!f.titulo.trim()) { showToast('Poné de qué se trata la moción', 'error'); return }
    setGuardando(true)
    const datos = { titulo: f.titulo.trim(), descripcion: f.descripcion.trim() || null, mayoria: f.mayoria, base: f.mayoria === 'simple' ? 'presentes' : f.base }
    if (mocion) {
      const { error } = await supabase.from('asamblea_mociones').update(datos).eq('id', mocion.id)
      setGuardando(false)
      if (error) { showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'asamblea_mociones', registroId: mocion.id, descripcion: `Moción editada (modo sala): "${datos.titulo}" — ${etiqueta}`, datosAntes: mocion, datosDespues: datos })
    } else {
      const orden = (d.mociones.reduce((m, x) => Math.max(m, x.orden), 0) || 0) + 1
      const { data, error } = await supabase.from('asamblea_mociones').insert([{ ...datos, asamblea_id: d.asamblea.id, orden }]).select().single()
      setGuardando(false)
      if (error) { showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'asamblea_mociones', registroId: data?.id, descripcion: `Moción agregada (modo sala): "${datos.titulo}" — ${etiqueta}`, datosDespues: data })
    }
    onListo()
  }

  const area: React.CSSProperties = { minHeight: 110, resize: 'vertical' }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 345, background: 'rgba(10,21,38,.97)', color: 'white', overflowY: 'auto', padding: '22px 20px 40px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button className="kz-mini" onClick={onCerrar}><X size={15} /> Volver a la sala</button>
        <div style={{ fontSize: 26, fontWeight: 800, margin: '18px 0 16px' }}>{mocion ? 'Editar moción' : 'Nueva moción'}</div>
        <label className="kz-label">¿Qué se vota?</label>
        <input className="kz-input" value={f.titulo} onChange={e => setF(x => ({ ...x, titulo: e.target.value }))} placeholder="Ej: Aprobar presupuesto de pintura de fachada" autoFocus />
        <div style={{ height: 14 }} />
        <label className="kz-label">Detalle (opcional)</label>
        <textarea className="kz-input" style={area} value={f.descripcion} onChange={e => setF(x => ({ ...x, descripcion: e.target.value }))} placeholder="Monto, empresa, condiciones..." />
        <div style={{ height: 18 }} />
        <label className="kz-label">Mayoría necesaria</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {MAYORIAS.map(m => <button key={m.value} className={`kz-opcion ${f.mayoria === m.value ? 'sel' : ''}`} style={{ padding: '14px 10px', fontSize: 15 }} onClick={() => setF(x => ({ ...x, mayoria: m.value }))}>{m.label.replace(' (más de la mitad)', '')}</button>)}
        </div>
        {ayudaMay && <div style={{ fontSize: 14, color: '#B8C5D6', marginTop: 8 }}>{ayudaMay}</div>}
        {f.mayoria !== 'simple' && (
          <>
            <div style={{ height: 16 }} />
            <label className="kz-label">Se calcula</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {BASES.map(b => <button key={b.value} className={`kz-opcion ${f.base === b.value ? 'sel' : ''}`} style={{ padding: '14px 10px', fontSize: 15 }} onClick={() => setF(x => ({ ...x, base: b.value }))}>{b.label}</button>)}
            </div>
            <div style={{ fontSize: 14, color: '#B8C5D6', marginTop: 8 }}>{BASES.find(b => b.value === f.base)?.ayuda}</div>
          </>
        )}
        <button className="kz-confirmar" onClick={guardar} disabled={guardando || !f.titulo.trim()}>{guardando ? <Loader2 size={24} className="spin" /> : <><Check size={26} strokeWidth={3} /> {mocion ? 'Guardar cambios' : 'Agregar moción'}</>}</button>
      </div>
    </div>
  )
}
