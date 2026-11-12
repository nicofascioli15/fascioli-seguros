'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ArrowLeft, Check, Search, FileSignature, Home, X, PenLine, User, Vote, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import { Pantalla, BotonesVoto, ResultadoCard, type ResultadoMocion } from '@/components/asambleas/Kiosco'
import FirmaPad, { type FirmaPadRef } from '@/components/asambleas/FirmaPad'
import { agruparPorVotante, claveVotante, votoLabel, mayoriaLabel, type Voto, type UnidadAsamblea } from '@/lib/asambleas'

// ============================================================================
// TABLET DE LA ASAMBLEA — sin usuario. Entra con el código de la asamblea (/t/7K3QX9)
// y solo puede acreditar y votar en esa asamblea (todo pasa por funciones de la base
// que controlan el código). No hay forma de salir al resto del sistema.
// Si en la computadora se abre una votación, la tablet cambia sola a la pantalla de votar.
// ============================================================================

type Estado = {
  asamblea: { id: string; edificio: string; fecha: string; tipo: string; estado: 'abierta' | 'cerrada'; modo_conteo: string; total_unidades: number | null }
  padron: { torre: string; unidad: string; coeficiente: number | null }[]
  torres: { codigo: string; nombre: string | null }[]
  acreditadas: { id: string; unidad: string; propietario: string | null; por_poder: boolean; apoderado: string | null; coeficiente: number | null; tel?: string | null }[]
  votando: { id: string; titulo: string; descripcion: string | null; mayoria: any; base: any } | null
  votadas: string[]
  resultados?: ResultadoMocion[]
}
type Persona = { nombre: string; apellido: string; tel: string; firma?: string | null }

const etiqueta = (p: { torre: string; unidad: string }) => (p.torre ? `${p.torre}-${p.unidad}` : p.unidad)
const completo = (p: Persona) => `${p.nombre.trim()} ${p.apellido.trim()}`.trim()
function separar(n: string): { nombre: string; apellido: string } {
  const partes = n.trim().split(/\s+/)
  return { nombre: partes[0] || '', apellido: partes.slice(1).join(' ') }
}

export default function TabletAsambleaPage() {
  const { codigo } = useParams() as { codigo: string }
  const supabase = createClient()
  const [e, setE] = useState<Estado | null | undefined>(undefined)

  async function cargar() {
    const { data, error } = await supabase.rpc('asam_tablet_estado', { p_codigo: codigo })
    if (error) { setE(prev => prev === undefined ? null : prev); return }
    setE(data || null)
  }
  useEffect(() => { cargar() }, [codigo])
  // Se actualiza sola (para pasar a votar cuando se abre una votación en la computadora)
  useEffect(() => { const t = setInterval(cargar, 3000); return () => clearInterval(t) }, [codigo])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (e === undefined) return <Pantalla><Centro><Loader2 size={34} className="spin" /></Centro></Pantalla>
  if (e === null) return <Pantalla><Centro><div style={{ fontSize: 22, fontWeight: 800 }}>Código de asamblea no válido</div><div style={{ fontSize: 16, color: '#B8C5D6', marginTop: 8 }}>Pedile a la administración el link de la tablet.</div></Centro></Pantalla>

  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526' }}>
        <img src="/logo-fascioli.svg" alt="Fascioli" style={{ height: 24 }} />
        <div style={{ flex: 1, minWidth: 0, marginLeft: 6 }}>
          <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            {e.votando ? <><Vote size={13} /> Votación</> : <><UserCheck size={13} /> Acreditación</>}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Asamblea {e.asamblea.edificio}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {e.votando ? <>{e.votadas.length}<span style={{ fontSize: 15, color: '#8A9BB5' }}> / {e.acreditadas.length}</span></> : <>{e.acreditadas.length}<span style={{ fontSize: 15, color: '#8A9BB5' }}>{e.asamblea.total_unidades ? ` / ${e.asamblea.total_unidades}` : ''}</span></>}
          </div>
          <div style={{ fontSize: 11, color: '#8A9BB5' }}>{e.votando ? 'unidades votaron' : 'unidades registradas'}</div>
        </div>
      </div>
      {e.asamblea.estado !== 'abierta'
        ? <Centro><div style={{ fontSize: 24, fontWeight: 800 }}>La asamblea está cerrada</div><div style={{ fontSize: 16, color: '#B8C5D6', marginTop: 8 }}>Gracias por participar.</div></Centro>
        : e.votando
          ? <Votacion key={e.votando.id} e={e} codigo={codigo} recargar={cargar} />
          : <Acreditacion e={e} codigo={codigo} recargar={cargar} />}
    </Pantalla>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30, overflowY: 'auto' }}><div style={{ width: '100%' }}>{children}</div></div>
}

// ── Acreditación ──────────────────────────────────────────────────────────
function Acreditacion({ e, codigo, recargar }: { e: Estado; codigo: string; recargar: () => Promise<void> }) {
  const supabase = createClient()
  const padron = useMemo(() => [...e.padron].sort((a, b) => a.torre.localeCompare(b.torre) || a.unidad.localeCompare(b.unidad, 'es', { numeric: true })), [e.padron])
  const torres = useMemo(() => {
    const cods = Array.from(new Set(padron.map(p => p.torre))).filter(Boolean).sort()
    return cods.map(c => ({ codigo: c, nombre: e.torres.find(t => t.codigo === c)?.nombre || null }))
  }, [padron, e.torres])
  const [torreSel, setTorreSel] = useState(() => (torres.length && !padron.some(p => !p.torre) ? torres[0].codigo : ''))
  const [buscar, setBuscar] = useState('')
  const [paso, setPaso] = useState<'lista' | 'form' | 'ok'>('lista')
  const [sel, setSel] = useState<{ torre: string; unidad: string } | null>(null)
  const [modo, setModo] = useState<'propietario' | 'poder'>('propietario')
  const [yo, setYo] = useState<Persona>({ nombre: '', apellido: '', tel: '' })
  const [firmaReuso, setFirmaReuso] = useState<string | null>(null)
  const [tieneFirma, setTieneFirma] = useState(false)
  const [preset, setPreset] = useState<Persona | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [ultimo, setUltimo] = useState<{ unidad: string; persona: Persona } | null>(null)
  const pad = useRef<FirmaPadRef>(null)
  const [ocultoResultado, setOcultoResultado] = useState<string | null>(null)

  const acreditadas = new Set(e.acreditadas.map(u => u.unidad.toLowerCase()))
  const personas = useMemo(() => {
    const m = new Map<string, Persona & { unidades: string[] }>()
    e.acreditadas.forEach(u => {
      const nombre = (u.por_poder ? u.apoderado : u.propietario) || ''
      if (!nombre.trim()) return
      const k = nombre.trim().toLowerCase()
      if (!m.has(k)) m.set(k, { ...separar(nombre), tel: '', unidades: [] })
      m.get(k)!.unidades.push(u.unidad)
    })
    return Array.from(m.values())
  }, [e.acreditadas])

  if (padron.length === 0) return <Centro><div style={{ fontSize: 22, fontWeight: 800 }}>Este edificio no tiene las unidades cargadas</div><div style={{ fontSize: 16, color: '#B8C5D6', marginTop: 8 }}>Avisale a la administración.</div></Centro>

  const q = buscar.trim().toLowerCase()
  const visibles = padron.filter(p => (q ? true : p.torre === torreSel) && (!q || etiqueta(p).toLowerCase().includes(q) || p.unidad.toLowerCase().includes(q)))

  function elegir(p: { torre: string; unidad: string }) {
    setSel(p); setTieneFirma(false)
    if (preset) { setModo('poder'); setYo(preset); setFirmaReuso(preset.firma || null) }
    else { setModo('propietario'); setYo({ nombre: '', apellido: '', tel: '' }); setFirmaReuso(null) }
    setPaso('form')
  }

  async function confirmar() {
    if (!sel) return
    if (!yo.nombre.trim() || !yo.apellido.trim()) { showToast('Poné nombre y apellido', 'error'); return }
    if (!yo.tel.replace(/\D/g, '')) { showToast('Poné un teléfono de contacto', 'error'); return }
    if (!firmaReuso && (pad.current?.vacia() ?? true)) { showToast('Falta la firma', 'error'); return }
    setGuardando(true)
    let firma = firmaReuso
    if (!firma) {
      const blob = await pad.current?.png()
      firma = blob ? await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob) }) : null
    }
    const { data, error } = await supabase.rpc('asam_tablet_acreditar', {
      p_codigo: codigo, p_torre: sel.torre, p_unidad: sel.unidad, p_nombre: completo(yo), p_tel: yo.tel.trim(), p_por_poder: modo === 'poder', p_firma: firma,
    })
    setGuardando(false)
    if (error || data?.error) { showToast(data?.error || `No se pudo registrar: ${error?.message}`, 'error'); await recargar(); setPaso('lista'); return }
    setUltimo({ unidad: data.unidad, persona: { ...yo, firma } })
    setPaso('ok'); setBuscar('')
    recargar()
  }

  function terminar() { setPreset(null); setUltimo(null); setSel(null); setPaso('lista') }

  if (paso === 'ok' && ultimo) return (
    <Centro>
      <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#16A34A', display: 'grid', placeItems: 'center', margin: '0 auto 20px', animation: 'kzPop .35s ease' }}><Check size={60} strokeWidth={3} /></div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>¡Unidad {ultimo.unidad} registrada!</div>
      <div style={{ fontSize: 17, color: '#B8C5D6', marginTop: 6 }}>{completo(ultimo.persona)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, margin: '28px auto 0' }}>
        <button className="kz-confirmar" style={{ marginTop: 0, background: 'rgba(226,196,122,.16)', color: '#E2C47A', border: '2px solid #E2C47A', fontSize: 19 }} onClick={() => { setPreset(ultimo.persona); setPaso('lista') }}>
          <FileSignature size={22} /> Traigo poder de otra unidad
        </button>
        <button className="kz-confirmar" style={{ marginTop: 0, fontSize: 19 }} onClick={terminar}><Check size={22} strokeWidth={3} /> Listo, paso la tablet</button>
      </div>
      {(e.resultados || []).some(r => r.estado !== 'cerrada') && (
        <div style={{ maxWidth: 560, margin: '26px auto 0', textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Se va a votar</div>
          {(e.resultados || []).filter(r => r.estado !== 'cerrada').sort((x, y) => x.orden - y.orden).map(r => (
            <div key={r.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 6 }}>
              <span style={{ color: '#8A9BB5', fontWeight: 700, marginRight: 8 }}>{r.orden}.</span><span style={{ fontWeight: 700 }}>{r.titulo}</span>
            </div>
          ))}
          <div style={{ fontSize: 14, color: '#B8C5D6', marginTop: 10 }}>Podés votar en esta tablet o desde tu celular con el QR de la sala.</div>
        </div>
      )}
    </Centro>
  )

  if (paso === 'form' && sel) return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button className="kz-mini" onClick={() => setPaso('lista')}><ArrowLeft size={15} /> Elegir otra unidad</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center', color: '#E2C47A', fontWeight: 800, fontSize: 20 }}>{sel.unidad}</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>Unidad {sel.unidad}{sel.torre ? <span style={{ fontSize: 16, color: '#8A9BB5' }}> · {torres.find(t => t.codigo === sel.torre)?.nombre || sel.torre}</span> : null}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          <button className={`kz-opcion ${modo === 'propietario' ? 'sel' : ''}`} onClick={() => setModo('propietario')}><Home size={22} /> Soy el propietario</button>
          <button className={`kz-opcion ${modo === 'poder' ? 'sel' : ''}`} onClick={() => setModo('poder')}><FileSignature size={22} /> Vengo con poder</button>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{modo === 'poder' ? 'Tus datos (firmás y votás por esta unidad)' : 'Tus datos'}</div>
        {modo === 'poder' && personas.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: '#B8C5D6', marginBottom: 8 }}>¿Ya te registraste? Tocá tu nombre (después poné tu teléfono):</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {personas.map(p => (
                <button key={completo(p) + p.unidades.join()} className="kz-chip" onClick={() => setYo(y => ({ nombre: p.nombre, apellido: p.apellido, tel: y.tel }))}>
                  {completo(p)} <span style={{ opacity: .7, fontWeight: 600 }}>({p.unidades.join(', ')})</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="kz-label">Nombre</label><input className="kz-input" value={yo.nombre} onChange={ev => setYo(y => ({ ...y, nombre: ev.target.value }))} autoComplete="off" /></div>
          <div><label className="kz-label">Apellido</label><input className="kz-input" value={yo.apellido} onChange={ev => setYo(y => ({ ...y, apellido: ev.target.value }))} autoComplete="off" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label className="kz-label">Teléfono</label><input className="kz-input" inputMode="tel" value={yo.tel} onChange={ev => setYo(y => ({ ...y, tel: ev.target.value }))} placeholder="Ej: 099 123 456" autoComplete="off" /></div>
        </div>
        <div style={{ marginTop: 20 }}>
          <label className="kz-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PenLine size={14} /> Firma</label>
          {firmaReuso ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(22,163,74,.12)', border: '1px solid rgba(74,222,128,.35)', borderRadius: 14, padding: '14px 16px', flexWrap: 'wrap' }}>
              <Check size={22} color="#4ADE80" />
              <div style={{ flex: 1, fontSize: 16 }}>Se usa la misma firma que ya hiciste</div>
              <button className="kz-mini" onClick={() => { setFirmaReuso(null); setTieneFirma(false) }}><PenLine size={14} /> Firmar de nuevo</button>
            </div>
          ) : <FirmaPad ref={pad} onCambio={setTieneFirma} />}
        </div>
        <button className="kz-confirmar" onClick={confirmar} disabled={guardando || !yo.nombre.trim() || !yo.apellido.trim() || !yo.tel.trim() || (!firmaReuso && !tieneFirma)}>
          {guardando ? <Loader2 size={24} className="spin" /> : <><Check size={26} strokeWidth={3} /> Registrarme</>}
        </button>
      </div>
    </div>
  )

  const ultimaCerrada = [...(e.resultados || [])].filter(r => r.estado === 'cerrada').sort((x, y) => y.orden - x.orden)[0]
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {ultimaCerrada && ocultoResultado !== ultimaCerrada.id && !preset && (
          <div style={{ maxWidth: 720, margin: '0 auto 22px' }}>
            <ResultadoCard r={ultimaCerrada} conCoef={e.asamblea.modo_conteo !== 'unidad'} grande />
            <div style={{ textAlign: 'center', marginTop: 10 }}><button className="kz-mini" style={{ margin: '0 auto' }} onClick={() => setOcultoResultado(ultimaCerrada.id)}><X size={14} /> Ocultar resultado</button></div>
          </div>
        )}
        {preset ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(226,196,122,.12)', border: '1px solid rgba(226,196,122,.4)', borderRadius: 14, padding: '12px 16px', marginBottom: 18, flexWrap: 'wrap' }}>
            <FileSignature size={22} color="#E2C47A" />
            <div style={{ flex: 1, fontSize: 17 }}><strong>{completo(preset)}</strong>: tocá la unidad de la que traés el poder</div>
            <button className="kz-mini" onClick={terminar}><X size={14} /> Terminé</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Tocá tu apartamento para registrarte</div>
            <div style={{ fontSize: 15, color: '#B8C5D6', marginTop: 4 }}>Si venís con poder, tocá el apartamento del que traés el poder</div>
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
        <div className="kz-aptos">
          {visibles.map(p => {
            const listo = acreditadas.has(etiqueta(p).toLowerCase())
            return (
              <button key={etiqueta(p)} disabled={listo} onClick={() => elegir(p)} className={`kz-persona ${listo ? 'listo' : ''}`} style={{ minHeight: 84, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 800 }}>{p.unidad}</span>
                  {listo && <span className="kz-ok"><Check size={16} strokeWidth={3} /></span>}
                </div>
                <div style={{ fontSize: 12.5, color: listo ? '#4ADE80' : '#8A9BB5', marginTop: 4 }}>
                  {listo ? 'Registrada' : (q && p.torre ? (torres.find(t => t.codigo === p.torre)?.nombre || p.torre) : 'Tocá para registrarte')}
                </div>
              </button>
            )
          })}
        </div>
        {visibles.length === 0 && <div style={{ textAlign: 'center', color: '#8A9BB5', fontSize: 16, padding: 30 }}>No se encontró ninguna unidad.</div>}
      </div>
      <style>{`.kz-aptos { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }`}</style>
    </div>
  )
}

// ── Votación (aparece sola cuando en la computadora se abre una votación) ──────
function Votacion({ e, codigo, recargar }: { e: Estado; codigo: string; recargar: () => Promise<void> }) {
  const supabase = createClient()
  const m = e.votando!
  const [paso, setPaso] = useState<'lista' | 'votar' | 'ok'>('lista')
  const [grupo, setGrupo] = useState<string | null>(null)
  const [eleccion, setEleccion] = useState<Record<string, Voto>>({})
  const [buscar, setBuscar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [ultimo, setUltimo] = useState<{ nombre: string; n: number } | null>(null)

  const unidades = e.acreditadas.map(u => ({ ...u, asamblea_id: '', created_at: '' })) as unknown as UnidadAsamblea[]
  const grupos = agruparPorVotante(unidades)
  const votadas = new Set(e.votadas)
  const pendientesDe = (us: UnidadAsamblea[]) => us.filter(u => !votadas.has(u.id))
  const g = grupo ? grupos.find(x => claveVotante(x.unidades[0]) === grupo) : null
  const pendientes = g ? pendientesDe(g.unidades) : []
  const q = buscar.trim().toLowerCase()
  const visibles = grupos.filter(gr => !q || gr.nombre.toLowerCase().includes(q) || gr.unidades.some(u => u.unidad.toLowerCase().includes(q)))

  async function confirmar() {
    if (!g) return
    const votos = pendientes.filter(u => eleccion[u.id]).map(u => ({ unidad_id: u.id, voto: eleccion[u.id] }))
    if (votos.length !== pendientes.length) { showToast('Falta elegir el voto de alguna unidad', 'error'); return }
    setGuardando(true)
    const { data, error } = await supabase.rpc('asam_tablet_votar', { p_codigo: codigo, p_mocion: m.id, p_votos: votos })
    setGuardando(false)
    if (error || data?.error) { showToast(data?.error || `No se pudo guardar el voto: ${error?.message}`, 'error'); await recargar(); setPaso('lista'); return }
    if (data?.aviso) showToast(data.aviso, 'error')
    setUltimo({ nombre: g.nombre, n: data?.registrados ?? votos.length })
    setPaso('ok')
    await recargar()
    setTimeout(() => { setPaso(p => (p === 'ok' ? 'lista' : p)); setGrupo(null); setBuscar('') }, 2600)
  }

  if (paso === 'ok') return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30 }} onClick={() => { setPaso('lista'); setGrupo(null) }}>
      <div>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#16A34A', display: 'grid', placeItems: 'center', margin: '0 auto 22px', animation: 'kzPop .35s ease' }}><Check size={64} strokeWidth={3} /></div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>¡Voto registrado!</div>
        <div style={{ fontSize: 18, color: '#B8C5D6', marginTop: 8 }}>{ultimo?.nombre}{ultimo && ultimo.n > 1 ? ` · ${ultimo.n} unidades` : ''}</div>
        <div style={{ fontSize: 20, color: '#E2C47A', marginTop: 26, fontWeight: 700 }}>Pasá la tablet a la siguiente persona</div>
      </div>
    </div>
  )

  if (paso === 'votar' && g) return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <button className="kz-mini" onClick={() => { setPaso('lista'); setGrupo(null) }}><ArrowLeft size={15} /> No soy yo</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 6px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center' }}><User size={28} color="#E2C47A" /></div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{g.nombre}</div>
            <div style={{ fontSize: 15, color: '#B8C5D6' }}>Vota por {pendientes.length === 1 ? 'la unidad' : `${pendientes.length} unidades`} {pendientes.map(u => u.unidad).join(', ')}</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '14px 16px', margin: '14px 0 20px' }}>
          <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Se vota</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{m.titulo}</div>
          {m.descripcion && <div style={{ fontSize: 15, color: '#B8C5D6', marginTop: 6, whiteSpace: 'pre-wrap' }}>{m.descripcion}</div>}
        </div>
        {pendientes.length === 0 ? <div style={{ fontSize: 18, textAlign: 'center', padding: 30, color: '#B8C5D6' }}>Ya votó por todas sus unidades.</div> : (
          <>
            {pendientes.length > 1 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: '#B8C5D6' }}>Votar lo mismo por todas las unidades:</div>
                <BotonesVoto valor={pendientes.every(u => eleccion[u.id] === eleccion[pendientes[0].id]) ? eleccion[pendientes[0].id] : undefined}
                  onVoto={v => { const x: Record<string, Voto> = {}; pendientes.forEach(u => { x[u.id] = v }); setEleccion(x) }} grande />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendientes.map(u => (
                <div key={u.id} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>Unidad {u.unidad}</span>
                    {u.por_poder && <span className="kz-tag"><FileSignature size={13} /> Por poder</span>}
                  </div>
                  <BotonesVoto valor={eleccion[u.id]} onVoto={v => setEleccion(x => ({ ...x, [u.id]: v }))} grande={pendientes.length === 1} />
                </div>
              ))}
            </div>
            <button onClick={confirmar} disabled={guardando || pendientes.some(u => !eleccion[u.id])} className="kz-confirmar">
              {guardando ? <Loader2 size={24} className="spin" /> : <><Check size={26} strokeWidth={3} /> Confirmar voto</>}
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#8A9BB5', marginTop: 10 }}>Mientras la votación esté abierta se puede cambiar el voto desde el celular o con la administración.</div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 13, color: '#E2C47A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Se vota</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{m.titulo}</div>
          <div style={{ fontSize: 14, color: '#B8C5D6', marginTop: 4 }}>{mayoriaLabel(m.mayoria)}</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, margin: '18px 0 14px' }}>Tocá tu nombre para votar</div>
        <div style={{ position: 'relative', maxWidth: 420, margin: '0 auto 18px' }}>
          <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
          <input value={buscar} onChange={ev => setBuscar(ev.target.value)} placeholder="Buscar por nombre o unidad"
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px 18px 14px 48px', fontSize: 17, borderRadius: 14, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: 'white', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div className="kz-grid">
          {visibles.map(gr => {
            const listo = pendientesDe(gr.unidades).length === 0
            return (
              <button key={gr.nombre} disabled={listo} onClick={() => { setGrupo(claveVotante(gr.unidades[0])); setEleccion({}); setPaso('votar') }} className={`kz-persona ${listo ? 'listo' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {listo ? <span className="kz-ok"><Check size={18} strokeWidth={3} /></span> : <User size={22} color="#E2C47A" />}
                  <span style={{ fontSize: 19, fontWeight: 800, textAlign: 'left' }}>{gr.nombre}</span>
                </div>
                <div style={{ fontSize: 14, color: listo ? '#4ADE80' : '#B8C5D6', marginTop: 8, textAlign: 'left' }}>
                  {listo ? 'Ya votó' : `Unidad${gr.unidades.length > 1 ? 'es' : ''} ${gr.unidades.map(u => u.unidad).join(', ')}`}
                </div>
              </button>
            )
          })}
        </div>
        {visibles.length === 0 && <div style={{ textAlign: 'center', color: '#8A9BB5', fontSize: 16, padding: 30 }}>No se encontró a nadie.</div>}
      </div>
    </div>
  )
}
