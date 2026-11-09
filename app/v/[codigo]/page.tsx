'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Check, Phone, Vote, FileSignature, Clock, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import { Pantalla, BotonesVoto, ResultadoCard, type ResultadoMocion } from '@/components/asambleas/Kiosco'
import { mayoriaLabel, votoLabel, type Voto } from '@/lib/asambleas'

// ============================================================================
// QR DE LA SALA — votación desde el celular de cada propietario, sin usuario.
// Entra con el teléfono con el que se registró en la tablet y queda vinculado a sus unidades
// (y a las que trae con poder). Ve la sesión completa: lo que se está votando y los resultados.
// ============================================================================

type Estado = {
  asamblea: { id: string; edificio: string; fecha: string; tipo: string; estado: 'abierta' | 'cerrada'; modo_conteo: string }
  mis_unidades: { id: string; unidad: string; por_poder: boolean; nombre: string | null; voto: Voto | null }[]
  votando: { id: string; titulo: string; descripcion: string | null; mayoria: any; base: any } | null
  resultados: ResultadoMocion[]
}

const CLAVE = 'fascioli-asamblea-dispositivo'
function dispositivo(): string {
  try {
    let d = localStorage.getItem(CLAVE)
    if (!d) { d = (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(CLAVE, d!) }
    return d!
  } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }
}

export default function VotoCelularPage() {
  const { codigo } = useParams() as { codigo: string }
  const supabase = createClient()
  const [disp, setDisp] = useState<string>('')
  const [e, setE] = useState<Estado | null | undefined>(undefined)
  const [tel, setTel] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [eleccion, setEleccion] = useState<Record<string, Voto>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { setDisp(dispositivo()) }, [])

  async function cargar(d = disp) {
    if (!d) return
    const { data, error } = await supabase.rpc('asam_cel_estado', { p_codigo: codigo, p_dispositivo: d })
    if (error) { setE(prev => prev === undefined ? null : prev); return }
    setE(data || null)
  }
  useEffect(() => { if (disp) cargar(disp) }, [disp, codigo])
  useEffect(() => { if (!disp) return; const t = setInterval(() => cargar(disp), 3000); return () => clearInterval(t) }, [disp, codigo])
  // Al cambiar de moción se limpia la elección
  const votandoId = e?.votando?.id
  useEffect(() => { setEleccion({}) }, [votandoId])

  async function ingresar() {
    setEntrando(true)
    const { data, error } = await supabase.rpc('asam_cel_ingresar', { p_codigo: codigo, p_tel: tel, p_dispositivo: disp })
    setEntrando(false)
    if (error || data?.error) { showToast(data?.error || error?.message || 'No se pudo entrar', 'error'); return }
    await cargar()
  }

  async function votar() {
    if (!e?.votando) return
    const pend = e.mis_unidades.filter(u => !u.voto)
    const votos = pend.filter(u => eleccion[u.id]).map(u => ({ unidad_id: u.id, voto: eleccion[u.id] }))
    if (votos.length !== pend.length) { showToast('Elegí el voto de todas tus unidades', 'error'); return }
    setGuardando(true)
    const { data, error } = await supabase.rpc('asam_cel_votar', { p_codigo: codigo, p_dispositivo: disp, p_mocion: e.votando.id, p_votos: votos })
    setGuardando(false)
    if (error || data?.error) { showToast(data?.error || error?.message || 'No se pudo votar', 'error'); await cargar(); return }
    showToast('¡Voto registrado!', 'success')
    await cargar()
  }

  function salir() {
    try { localStorage.removeItem(CLAVE) } catch {}
    const d = dispositivo(); setDisp(d); setE(undefined); cargar(d)
  }

  if (e === undefined) return <Pantalla><Centro><Loader2 size={34} className="spin" /></Centro></Pantalla>
  if (e === null) return <Pantalla><Centro><div style={{ fontSize: 22, fontWeight: 800 }}>Código de asamblea no válido</div><div style={{ fontSize: 16, color: '#B8C5D6', marginTop: 8 }}>Volvé a escanear el QR de la sala.</div></Centro></Pantalla>

  // El QR vive solo mientras dura la asamblea: cerrada, ya no muestra nada más.
  if (e.asamblea.estado !== 'abierta') return (
    <Pantalla><Centro>
      <div style={{ fontSize: 24, fontWeight: 800 }}>La asamblea terminó</div>
      <div style={{ fontSize: 16, color: '#B8C5D6', marginTop: 8 }}>{e.asamblea.edificio}. Gracias por participar.</div>
    </Centro></Pantalla>
  )

  const conCoef = e.asamblea.modo_conteo !== 'unidad'
  const pendientes = e.mis_unidades.filter(u => !u.voto)
  const cerradas = e.resultados.filter(r => r.estado === 'cerrada').sort((a, b) => b.orden - a.orden)
  const proximas = e.resultados.filter(r => r.estado === 'pendiente').sort((a, b) => a.orden - b.orden)
  const nombre = e.mis_unidades.find(u => u.nombre)?.nombre

  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526' }}>
        <img src="/logo-fascioli.svg" alt="Fascioli" style={{ height: 20 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#E2C47A', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Asamblea</div>
          <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.asamblea.edificio}</div>
        </div>
        {e.mis_unidades.length > 0 && <button className="kz-mini" style={{ padding: '7px 10px', fontSize: 12.5 }} onClick={salir} title="Desvincular este celular"><LogOut size={13} /></button>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 40px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ingreso */}
          {e.asamblea.estado === 'abierta' && e.mis_unidades.length === 0 && (
            <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Votá desde tu celular</div>
              <div style={{ fontSize: 15, color: '#B8C5D6', marginBottom: 14 }}>Poné el teléfono con el que te registraste en la tablet al llegar. Vas a poder votar por tu unidad y por las que traés con poder.</div>
              <label className="kz-label">Tu teléfono</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
                <input className="kz-input" style={{ paddingLeft: 42 }} inputMode="tel" value={tel} onChange={ev => setTel(ev.target.value)} placeholder="099 123 456" onKeyDown={ev => { if (ev.key === 'Enter') ingresar() }} />
              </div>
              <button className="kz-confirmar" onClick={ingresar} disabled={entrando || tel.replace(/\D/g, '').length < 6}>{entrando ? <Loader2 size={22} className="spin" /> : 'Entrar'}</button>
              <div style={{ fontSize: 13, color: '#8A9BB5', marginTop: 10, textAlign: 'center' }}>¿Todavía no te registraste? Pedile la tablet a la administración.</div>
            </div>
          )}

          {/* Mis unidades */}
          {e.mis_unidades.length > 0 && (
            <div style={{ fontSize: 14, color: '#B8C5D6' }}>
              {nombre ? <><strong style={{ color: 'white' }}>{nombre}</strong> · </> : null}
              Votás por: {e.mis_unidades.map(u => <span key={u.id} style={{ fontWeight: 800, color: 'white' }}>{u.unidad}{u.por_poder ? ' (poder)' : ''}{' '}</span>)}
            </div>
          )}

          {/* En votación */}
          {e.votando && (
            <div style={{ background: 'rgba(226,196,122,.08)', border: '1.5px solid #E2C47A', borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6 }}><Vote size={14} /> Se está votando</div>
              <div style={{ fontSize: 21, fontWeight: 800, marginTop: 4 }}>{e.votando.titulo}</div>
              {e.votando.descripcion && <div style={{ fontSize: 15, color: '#B8C5D6', marginTop: 6, whiteSpace: 'pre-wrap' }}>{e.votando.descripcion}</div>}
              <div style={{ fontSize: 13, color: '#8A9BB5', marginTop: 6 }}>{mayoriaLabel(e.votando.mayoria)}</div>

              {e.mis_unidades.length > 0 && (pendientes.length === 0 ? (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 800, color: '#4ADE80' }}><Check size={20} strokeWidth={3} /> Ya votaste</div>
                  {e.mis_unidades.map(u => <div key={u.id} style={{ fontSize: 14, color: '#B8C5D6' }}>Unidad {u.unidad}: <strong style={{ color: 'white' }}>{u.voto ? votoLabel(u.voto) : '—'}</strong></div>)}
                  <div style={{ fontSize: 13, color: '#8A9BB5', marginTop: 4 }}>El resultado aparece acá cuando se cierre la votación.</div>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  {pendientes.length > 1 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#B8C5D6' }}>Lo mismo por todas:</div>
                      <BotonesVoto valor={pendientes.every(u => eleccion[u.id] === eleccion[pendientes[0].id]) ? eleccion[pendientes[0].id] : undefined}
                        onVoto={v => { const x: Record<string, Voto> = {}; pendientes.forEach(u => { x[u.id] = v }); setEleccion(x) }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pendientes.map(u => (
                      <div key={u.id}>
                        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>Unidad {u.unidad}{u.por_poder && <span className="kz-tag"><FileSignature size={12} /> Poder</span>}</div>
                        <BotonesVoto valor={eleccion[u.id]} onVoto={v => setEleccion(x => ({ ...x, [u.id]: v }))} grande={pendientes.length === 1} />
                      </div>
                    ))}
                  </div>
                  <button className="kz-confirmar" onClick={votar} disabled={guardando || pendientes.some(u => !eleccion[u.id])}>
                    {guardando ? <Loader2 size={22} className="spin" /> : <><Check size={24} strokeWidth={3} /> Confirmar voto</>}
                  </button>
                  <div style={{ textAlign: 'center', fontSize: 12.5, color: '#8A9BB5', marginTop: 8 }}>Una vez confirmado no se puede cambiar.</div>
                </div>
              ))}
            </div>
          )}

          {!e.votando && e.asamblea.estado === 'abierta' && e.mis_unidades.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#B8C5D6', background: 'rgba(255,255,255,.04)', borderRadius: 14, padding: 14 }}>
              <Clock size={18} /> Esperando la próxima votación. Esta pantalla se actualiza sola.
            </div>
          )}

          {/* Resultados */}
          {cerradas.length > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>Resultados</div>}
          {cerradas.map(r => <ResultadoCard key={r.id} r={r} conCoef={conCoef} />)}

          {proximas.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>Se va a votar</div>
              {proximas.map(r => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: '#8A9BB5', fontWeight: 700 }}>Moción {r.orden}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{r.titulo}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Pantalla>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }}><div style={{ width: '100%' }}>{children}</div></div>
}
