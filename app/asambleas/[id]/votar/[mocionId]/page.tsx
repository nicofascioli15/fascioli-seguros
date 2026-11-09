'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Check, Search, FileSignature, Lock, ThumbsUp, ThumbsDown, MinusCircle, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Pantalla } from '@/components/asambleas/Kiosco'
import { fetchAsamblea, cerrarVotacion, type AsambleaCompleta } from '@/lib/asambleasData'
import { agruparPorVotante, claveVotante, votoLabel, mayoriaLabel, calcularResultado, type Voto, type UnidadAsamblea } from '@/lib/asambleas'

// Modo tablet: pantalla completa, botones grandes. Se pasa de mano en mano:
// cada persona toca su nombre, vota por su unidad (y por las que trae por poder) y devuelve la tablet.
export default function VotarPage() {
  const { id, mocionId } = useParams() as { id: string; mocionId: string }
  const router = useRouter()
  const supabase = createClient()
  const [d, setD] = useState<AsambleaCompleta | null | undefined>(undefined)
  const [paso, setPaso] = useState<'lista' | 'votar' | 'ok'>('lista')
  const [grupo, setGrupo] = useState<string | null>(null)          // clave del votante elegido
  const [eleccion, setEleccion] = useState<Record<string, Voto>>({})
  const [buscar, setBuscar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [ultimo, setUltimo] = useState<{ nombre: string; n: number } | null>(null)

  useEffect(() => { cargar() }, [id, mocionId])
  async function cargar() { setD(await fetchAsamblea(supabase, id)) }

  // Refresco liviano mientras está en la lista (por si se vota también desde otro dispositivo)
  useEffect(() => {
    if (paso !== 'lista') return
    const t = setInterval(cargar, 6000)
    return () => clearInterval(t)
  }, [paso, id])

  // Bloquea el scroll de la página de atrás mientras está la pantalla completa
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const mocion = d?.mociones.find(m => m.id === mocionId)
  const votadas = useMemo(() => new Set((d?.votos || []).filter(v => v.mocion_id === mocionId).map(v => v.unidad_id)), [d, mocionId])
  const grupos = useMemo(() => agruparPorVotante(d?.unidades || []), [d])

  if (d === undefined) return <Pantalla><div style={{ display: 'grid', placeItems: 'center', flex: 1 }}><Loader2 size={34} className="spin" /></div></Pantalla>
  if (!d || !mocion) return (
    <Pantalla>
      <div style={{ display: 'grid', placeItems: 'center', flex: 1, textAlign: 'center', gap: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>No se encontró la moción</div>
        <button className="btn-outline" onClick={() => router.push(`/asambleas/${id}`)}>Volver a la asamblea</button>
      </div>
    </Pantalla>
  )

  const abierta = mocion.estado === 'votando' && d.asamblea.estado === 'abierta'
  const total = d.unidades.length
  const nVotadas = d.unidades.filter(u => votadas.has(u.id)).length
  const pct = total ? nVotadas / total : 0
  const q = buscar.trim().toLowerCase()
  const visibles = grupos.filter(g => !q || g.nombre.toLowerCase().includes(q) || g.unidades.some(u => u.unidad.toLowerCase().includes(q)))
  const pendientesDe = (us: UnidadAsamblea[]) => us.filter(u => !votadas.has(u.id))
  const g = grupo ? grupos.find(x => claveVotante(x.unidades[0]) === grupo) : null
  const pendientesGrupo = g ? pendientesDe(g.unidades) : []

  function elegirPersona(clave: string) {
    setGrupo(clave); setEleccion({}); setPaso('votar')
  }

  function votarTodas(v: Voto) {
    const e: Record<string, Voto> = {}
    pendientesGrupo.forEach(u => { e[u.id] = v })
    setEleccion(e)
  }

  async function confirmar() {
    if (!g || !mocion) return
    const filas = pendientesGrupo.filter(u => eleccion[u.id]).map(u => ({ mocion_id: mocion.id, unidad_id: u.id, voto: eleccion[u.id] }))
    if (filas.length !== pendientesGrupo.length) { showToast('Falta elegir el voto de alguna unidad', 'error'); return }
    setGuardando(true)
    const { error } = await supabase.from('asamblea_votos').insert(filas)
    setGuardando(false)
    if (error) {
      showToast(error.message.includes('duplicate') ? 'Alguna de estas unidades ya había votado. Se actualizó la lista.' : `No se pudo guardar el voto: ${error.message}`, 'error')
      await cargar(); setPaso('lista'); return
    }
    const resumen = pendientesGrupo.map(u => `${u.unidad}: ${votoLabel(eleccion[u.id])}`).join(', ')
    await registrarAudit({ accion: 'crear', tabla: 'asamblea_votos', descripcion: `Votó ${g.nombre} (${resumen}) en "${mocion.titulo}" — ${d!.edificio}`, datosDespues: filas })
    setUltimo({ nombre: g.nombre, n: filas.length })
    setPaso('ok')
    await cargar()
    setTimeout(() => { setPaso(p => (p === 'ok' ? 'lista' : p)); setGrupo(null); setBuscar('') }, 2600)
  }

  async function cerrar() {
    setCerrando(true)
    const r = await cerrarVotacion(supabase, d!, mocion!)
    setCerrando(false)
    if (r.error) { showToast(r.error, 'error'); return }
    router.push(`/asambleas/${id}`)
  }

  const r = calcularResultado(d.asamblea, mocion, d.unidades, d.votos.filter(v => v.mocion_id === mocionId))

  return (
    <Pantalla>
      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526' }}>
        <button onClick={() => router.push(`/asambleas/${id}`)} className="kz-mini"><ArrowLeft size={15} /> Salir</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{d.edificio} · Votación</div>
          <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mocion.titulo}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{nVotadas}<span style={{ fontSize: 15, color: '#8A9BB5' }}> / {total}</span></div>
          <div style={{ fontSize: 11, color: '#8A9BB5' }}>unidades votaron</div>
        </div>
        {abierta && <button onClick={() => setConfirmCerrar(true)} className="kz-mini"><Lock size={14} /> Cerrar votación</button>}
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.08)' }}><div style={{ height: '100%', width: `${pct * 100}%`, background: '#E2C47A', transition: 'width .4s' }} /></div>

      {!abierta ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{mocion.estado === 'cerrada' ? 'La votación está cerrada' : 'La votación todavía no está abierta'}</div>
            {mocion.estado === 'cerrada' && <div style={{ fontSize: 30, fontWeight: 800, color: mocion.aprobada ? '#4ADE80' : '#F87171', marginBottom: 16 }}>{mocion.aprobada ? 'APROBADA' : 'RECHAZADA'}</div>}
            <button className="kz-mini" style={{ margin: '0 auto' }} onClick={() => router.push(`/asambleas/${id}`)}><ArrowLeft size={15} /> Volver a la asamblea</button>
          </div>
        </div>
      ) : paso === 'ok' ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }} onClick={() => { setPaso('lista'); setGrupo(null); setBuscar('') }}>
          <div>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#16A34A', display: 'grid', placeItems: 'center', margin: '0 auto 22px', animation: 'kzPop .35s ease' }}><Check size={64} strokeWidth={3} /></div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>¡Voto registrado!</div>
            <div style={{ fontSize: 18, color: '#B8C5D6', marginTop: 8 }}>{ultimo?.nombre}{ultimo && ultimo.n > 1 ? ` · ${ultimo.n} unidades` : ''}</div>
            <div style={{ fontSize: 20, color: '#E2C47A', marginTop: 26, fontWeight: 700 }}>Pasá la tablet a la siguiente persona</div>
          </div>
        </div>
      ) : paso === 'votar' && g ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <button className="kz-mini" onClick={() => { setPaso('lista'); setGrupo(null) }}><ArrowLeft size={15} /> No soy yo</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 6px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center' }}><User size={28} color="#E2C47A" /></div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{g.nombre}</div>
                <div style={{ fontSize: 15, color: '#B8C5D6' }}>Vota por {pendientesGrupo.length === 1 ? 'la unidad' : `${pendientesGrupo.length} unidades`} {pendientesGrupo.map(u => u.unidad).join(', ')}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '14px 16px', margin: '14px 0 20px' }}>
              <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Se vota</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{mocion.titulo}</div>
              {mocion.descripcion && <div style={{ fontSize: 15, color: '#B8C5D6', marginTop: 6, whiteSpace: 'pre-wrap' }}>{mocion.descripcion}</div>}
            </div>

            {pendientesGrupo.length === 0 ? (
              <div style={{ fontSize: 18, textAlign: 'center', padding: 30, color: '#B8C5D6' }}>Ya votó por todas sus unidades.</div>
            ) : (
              <>
                {pendientesGrupo.length > 1 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: '#B8C5D6' }}>Votar lo mismo por todas las unidades:</div>
                    <BotonesVoto valor={pendientesGrupo.every(u => eleccion[u.id] === eleccion[pendientesGrupo[0].id]) ? eleccion[pendientesGrupo[0].id] : undefined} onVoto={votarTodas} grande />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendientesGrupo.map(u => (
                    <div key={u.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 20, fontWeight: 800 }}>Unidad {u.unidad}</span>
                        {u.por_poder && <span className="kz-tag"><FileSignature size={13} /> Por poder{u.propietario ? ` de ${u.propietario}` : ''}</span>}
                        {d.asamblea.modo_conteo !== 'unidad' && u.coeficiente != null && <span style={{ fontSize: 13, color: '#8A9BB5' }}>{u.coeficiente}%</span>}
                      </div>
                      <BotonesVoto valor={eleccion[u.id]} onVoto={v => setEleccion(e => ({ ...e, [u.id]: v }))} grande={pendientesGrupo.length === 1} />
                    </div>
                  ))}
                </div>
                <button onClick={confirmar} disabled={guardando || pendientesGrupo.some(u => !eleccion[u.id])} className="kz-confirmar">
                  {guardando ? <Loader2 size={24} className="spin" /> : <><Check size={26} strokeWidth={3} /> Confirmar voto</>}
                </button>
                <div style={{ textAlign: 'center', fontSize: 13, color: '#8A9BB5', marginTop: 10 }}>Una vez confirmado no se puede cambiar desde la tablet.</div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>Tocá tu nombre para votar</div>
              <div style={{ fontSize: 15, color: '#B8C5D6', marginTop: 4 }}>{mayoriaLabel(mocion.mayoria)} · hace falta {r.necesario}</div>
            </div>
            <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto 20px' }}>
              <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
              <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre o unidad"
                style={{ width: '100%', boxSizing: 'border-box', padding: '15px 18px 15px 48px', fontSize: 18, borderRadius: 14, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: 'white', outline: 'none', fontFamily: 'inherit' }} />
            </div>
            {nVotadas === total && total > 0 && (
              <div style={{ textAlign: 'center', background: 'rgba(22,163,74,.15)', border: '1px solid rgba(74,222,128,.4)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#4ADE80' }}>Votaron todas las unidades</div>
                <button className="kz-mini" style={{ margin: '10px auto 0' }} onClick={() => setConfirmCerrar(true)}><Lock size={14} /> Cerrar votación y ver resultado</button>
              </div>
            )}
            <div className="kz-grid">
              {visibles.map(gr => {
                const pend = pendientesDe(gr.unidades)
                const listo = pend.length === 0
                return (
                  <button key={gr.nombre} disabled={listo} onClick={() => elegirPersona(claveVotante(gr.unidades[0]))} className={`kz-persona ${listo ? 'listo' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {listo ? <span className="kz-ok"><Check size={18} strokeWidth={3} /></span> : <User size={22} color="#E2C47A" />}
                      <span style={{ fontSize: 19, fontWeight: 800, textAlign: 'left' }}>{gr.nombre}</span>
                    </div>
                    <div style={{ fontSize: 14, color: listo ? '#4ADE80' : '#B8C5D6', marginTop: 8, textAlign: 'left' }}>
                      {listo ? 'Ya votó' : `Unidad${gr.unidades.length > 1 ? 'es' : ''} ${gr.unidades.map(u => u.unidad).join(', ')}`}
                      {!listo && gr.unidades.some(u => u.por_poder) && <span className="kz-tag" style={{ marginLeft: 6 }}><FileSignature size={12} /> con poder</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            {visibles.length === 0 && <div style={{ textAlign: 'center', color: '#8A9BB5', fontSize: 16, padding: 30 }}>{total === 0 ? 'No hay unidades acreditadas.' : 'No se encontró a nadie con ese nombre o unidad.'}</div>}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCerrar}
        title="¿Cerrar la votación?"
        message={total - nVotadas > 0 ? `${total - nVotadas} unidad${total - nVotadas > 1 ? 'es' : ''} todavía no votaron. Se calcula el resultado con los votos que hay.` : 'Se calcula y se guarda el resultado.'}
        confirmLabel="Cerrar votación"
        tone="neutral"
        loading={cerrando}
        onConfirm={cerrar}
        onCancel={() => setConfirmCerrar(false)}
      />
    </Pantalla>
  )
}

function BotonesVoto({ valor, onVoto, grande }: { valor?: Voto; onVoto: (v: Voto) => void; grande?: boolean }) {
  const ops: { v: Voto; label: string; icon: any; bg: string; borde: string }[] = [
    { v: 'si', label: 'A favor', icon: ThumbsUp, bg: '#16A34A', borde: '#4ADE80' },
    { v: 'no', label: 'En contra', icon: ThumbsDown, bg: '#DC2626', borde: '#F87171' },
    { v: 'abstencion', label: 'Abstención', icon: MinusCircle, bg: '#475569', borde: '#94A3B8' },
  ]
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {ops.map(o => {
        const sel = valor === o.v
        const Icon = o.icon
        return (
          <button key={o.v} className="kz-voto" onClick={() => onVoto(o.v)}
            style={{ background: sel ? o.bg : 'rgba(255,255,255,.06)', borderColor: sel ? o.borde : 'rgba(255,255,255,.12)', opacity: valor && !sel ? .55 : 1, padding: grande ? '26px 10px' : '16px 8px', fontSize: grande ? 21 : 17, boxShadow: sel ? `0 0 0 4px ${o.borde}33` : 'none' }}>
            <Icon size={grande ? 34 : 24} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
