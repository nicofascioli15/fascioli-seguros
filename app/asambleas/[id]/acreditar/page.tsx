'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Check, Search, FileSignature, Home, X, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { Pantalla } from '@/components/asambleas/Kiosco'
import { fetchAsamblea, type AsambleaCompleta } from '@/lib/asambleasData'
import { traerPadron } from '@/lib/padronImport'
import FirmaPad, { type FirmaPadRef } from '@/components/asambleas/FirmaPad'

type Padron = { label: string; torre: string; num: string; propietario: string | null; tel: string | null; coeficiente: number | null }
type Persona = { nombre: string; apellido: string; tel: string; firma?: string | null }

// "SERGIO KON" → { nombre: 'Sergio', apellido: 'Kon' } (si hay varios dueños "A / B" se deja todo en nombre)
function separar(n: string | null): { nombre: string; apellido: string } {
  const s = (n || '').trim()
  if (!s || s.includes('/')) return { nombre: s, apellido: '' }
  const cap = (x: string) => x === x.toUpperCase() ? x.toLowerCase().replace(/(^|\s)\p{L}/gu, m => m.toUpperCase()) : x
  const partes = s.split(/\s+/)
  return { nombre: cap(partes[0]), apellido: cap(partes.slice(1).join(' ')) }
}
const completo = (p: Persona) => `${p.nombre.trim()} ${p.apellido.trim()}`.trim()

// Autorregistro en la tablet: cada persona toca su apartamento, pone sus datos y la pasa.
export default function AcreditarTabletPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()
  const [d, setD] = useState<AsambleaCompleta | null | undefined>(undefined)
  const [padron, setPadron] = useState<Padron[]>([])
  const [torres, setTorres] = useState<{ codigo: string; nombre: string | null }[]>([])
  const [torreSel, setTorreSel] = useState('')
  const [buscar, setBuscar] = useState('')
  const [paso, setPaso] = useState<'lista' | 'form' | 'ok'>('lista')
  const [sel, setSel] = useState<Padron | null>(null)
  const [modo, setModo] = useState<'propietario' | 'poder'>('propietario')
  const [yo, setYo] = useState<Persona>({ nombre: '', apellido: '', tel: '' })          // quien está con la tablet
  const [firmaReuso, setFirmaReuso] = useState<string | null>(null)                     // firma ya hecha que se vuelve a usar (poderes)
  const [tieneFirma, setTieneFirma] = useState(false)
  const pad = useRef<FirmaPadRef>(null)
  const [preset, setPreset] = useState<Persona | null>(null)                            // "sigo registrando poderes con mis datos"
  const [guardando, setGuardando] = useState(false)
  const [ultimo, setUltimo] = useState<{ unidad: string; persona: Persona } | null>(null)

  useEffect(() => { cargar() }, [id])
  async function cargar() {
    const a = await fetchAsamblea(supabase, id)
    setD(a)
    if (!a) return
    const p = await traerPadron(supabase, a.asamblea.edificio_id).catch(() => ({ unidades: [], torres: [] }))
    const lista: Padron[] = p.unidades
    setPadron(lista)
    setTorres(p.torres)
    const cods = p.torres.map(t => t.codigo)
    if (cods.length && !lista.some(u => !u.torre)) setTorreSel(t => t || cods[0])
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const acreditadas = useMemo(() => new Set((d?.unidades || []).map(u => u.unidad.toLowerCase())), [d])
  // Personas ya registradas: para copiar los datos al venir con poder ("soy yo, ya me registré")
  const personas = useMemo(() => {
    const m = new Map<string, Persona & { unidades: string[] }>()
    ;(d?.unidades || []).forEach(u => {
      const nombre = (u.por_poder ? u.apoderado : u.propietario) || ''
      if (!nombre.trim()) return
      const k = nombre.trim().toLowerCase()
      if (!m.has(k)) m.set(k, { ...separar(nombre), tel: (u.por_poder ? u.apoderado_tel : u.propietario_tel) || '', firma: u.firma_path || null, unidades: [] })
      m.get(k)!.unidades.push(u.unidad)
    })
    return Array.from(m.values())
  }, [d])

  if (d === undefined) return <Pantalla><div style={{ flex: 1, display: 'grid', placeItems: 'center' }}><Loader2 size={34} className="spin" /></div></Pantalla>
  if (!d) return <Pantalla><div style={{ flex: 1, display: 'grid', placeItems: 'center' }}><button className="kz-mini" onClick={() => router.push('/asambleas')}>Volver</button></div></Pantalla>

  const abierta = d.asamblea.estado === 'abierta'
  const q = buscar.trim().toLowerCase()
  const visibles = padron.filter(p => (q ? true : p.torre === torreSel) && (!q || p.label.toLowerCase().includes(q) || p.num.toLowerCase().includes(q)))

  // No se usan los nombres del padrón (pueden estar desactualizados): cada persona escribe los suyos.
  function elegir(p: Padron) {
    setSel(p)
    setTieneFirma(false)
    if (preset) { setModo('poder'); setYo(preset); setFirmaReuso(preset.firma || null) }
    else { setModo('propietario'); setYo({ nombre: '', apellido: '', tel: '' }); setFirmaReuso(null) }
    setPaso('form')
  }

  function cambiarModo(m: 'propietario' | 'poder') {
    setModo(m)
  }

  function usarPersona(p: Persona) {
    setYo({ nombre: p.nombre, apellido: p.apellido, tel: p.tel })
    setFirmaReuso(p.firma || null)
  }

  async function subirFirma(): Promise<string | null> {
    if (firmaReuso) return firmaReuso
    const blob = await pad.current?.png()
    if (!blob) return null
    const path = `asambleas/${id}/firmas/${sel!.label.replace(/[^\w-]/g, '_')}_${Date.now()}.png`
    const { error } = await supabase.storage.from('documentos').upload(path, blob, { contentType: 'image/png', upsert: false })
    if (error) throw new Error(`No se pudo guardar la firma: ${error.message}`)
    return path
  }

  async function confirmar() {
    if (!sel || !d) return
    if (!yo.nombre.trim() || !yo.apellido.trim()) { showToast('Poné nombre y apellido', 'error'); return }
    if (!yo.tel.replace(/\D/g, '')) { showToast('Poné un teléfono de contacto', 'error'); return }
    if (!firmaReuso && (pad.current?.vacia() ?? true)) { showToast('Falta la firma', 'error'); return }
    setGuardando(true)
    const nombre = completo(yo)
    let firma: string | null = null
    try { firma = await subirFirma() } catch (e: any) { setGuardando(false); showToast(e?.message || 'No se pudo guardar la firma', 'error'); return }
    // Por poder solo interesa la unidad y quién firma y vota por ella.
    const fila = modo === 'propietario'
      ? { asamblea_id: d.asamblea.id, unidad: sel.label, propietario: nombre, propietario_tel: yo.tel.trim(), coeficiente: sel.coeficiente, por_poder: false, apoderado: null, apoderado_tel: null, firma_path: firma }
      : { asamblea_id: d.asamblea.id, unidad: sel.label, propietario: null, propietario_tel: null, coeficiente: sel.coeficiente, por_poder: true, apoderado: nombre, apoderado_tel: yo.tel.trim(), firma_path: firma }
    const { data, error } = await supabase.from('asamblea_unidades').insert([fila]).select().single()
    setGuardando(false)
    if (error) {
      showToast(error.message.includes('duplicate') ? `La unidad ${sel.label} ya estaba registrada` : `No se pudo registrar: ${error.message}`, 'error')
      await cargar(); setPaso('lista'); return
    }
    await registrarAudit({ accion: 'crear', tabla: 'asamblea_unidades', registroId: data?.id, descripcion: `Unidad ${sel.label} se acreditó en la tablet${modo === 'poder' ? ` por poder (${nombre})` : ` (${nombre})`} — ${d.edificio}`, datosDespues: data })
    setUltimo({ unidad: sel.label, persona: { ...yo, firma } })
    setPaso('ok')
    setBuscar('')
    cargar()
  }

  function terminar() { setPreset(null); setUltimo(null); setSel(null); setPaso('lista') }

  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526' }}>
        <button onClick={() => router.push(`/asambleas/${id}`)} className="kz-mini"><ArrowLeft size={15} /> Salir</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Acreditación</div>
          <div style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Asamblea {d.edificio}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{d.unidades.length}<span style={{ fontSize: 15, color: '#8A9BB5' }}>{d.asamblea.total_unidades ? ` / ${d.asamblea.total_unidades}` : ''}</span></div>
          <div style={{ fontSize: 11, color: '#8A9BB5' }}>unidades registradas</div>
        </div>
      </div>

      {!abierta ? (
        <Centro><div style={{ fontSize: 22, fontWeight: 800 }}>La asamblea está cerrada</div></Centro>
      ) : padron.length === 0 ? (
        <Centro>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Este edificio no tiene las unidades cargadas</div>
          <div style={{ fontSize: 16, color: '#B8C5D6', marginBottom: 18 }}>Importalas en Asambleas → Edificios y unidades, o acreditá desde la computadora.</div>
          <button className="kz-mini" style={{ margin: '0 auto' }} onClick={() => router.push(`/asambleas/${id}`)}><ArrowLeft size={15} /> Volver</button>
        </Centro>
      ) : paso === 'ok' && ultimo ? (
        <Centro>
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#16A34A', display: 'grid', placeItems: 'center', margin: '0 auto 20px', animation: 'kzPop .35s ease' }}><Check size={60} strokeWidth={3} /></div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>¡Unidad {ultimo.unidad} registrada!</div>
          <div style={{ fontSize: 17, color: '#B8C5D6', marginTop: 6 }}>{completo(ultimo.persona)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, margin: '28px auto 0' }}>
            <button className="kz-confirmar" style={{ marginTop: 0, background: 'rgba(226,196,122,.16)', color: '#E2C47A', border: '2px solid #E2C47A', fontSize: 19 }}
              onClick={() => { setPreset(ultimo.persona); setPaso('lista') }}>
              <FileSignature size={22} /> Traigo poder de otra unidad
            </button>
            <button className="kz-confirmar" style={{ marginTop: 0, fontSize: 19 }} onClick={terminar}><Check size={22} strokeWidth={3} /> Listo, paso la tablet</button>
          </div>
        </Centro>
      ) : paso === 'form' && sel ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <button className="kz-mini" onClick={() => setPaso('lista')}><ArrowLeft size={15} /> Elegir otra unidad</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center', color: '#E2C47A', fontWeight: 800, fontSize: 20 }}>{sel.num}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>Unidad {sel.num}{sel.torre ? <span style={{ fontSize: 16, color: '#8A9BB5' }}> · {torres.find(t => t.codigo === sel.torre)?.nombre || sel.torre}</span> : null}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
              <button className={`kz-opcion ${modo === 'propietario' ? 'sel' : ''}`} onClick={() => cambiarModo('propietario')}><Home size={22} /> Soy el propietario</button>
              <button className={`kz-opcion ${modo === 'poder' ? 'sel' : ''}`} onClick={() => cambiarModo('poder')}><FileSignature size={22} /> Vengo con poder</button>
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{modo === 'poder' ? 'Tus datos (firmás y votás por esta unidad)' : 'Tus datos'}</div>
            {modo === 'poder' && personas.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: '#B8C5D6', marginBottom: 8 }}>¿Ya te registraste? Tocá tu nombre y se copian tus datos:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {personas.map(p => (
                    <button key={completo(p) + p.unidades.join()} className="kz-chip" onClick={() => usarPersona(p)}>
                      {completo(p)} <span style={{ opacity: .7, fontWeight: 600 }}>({p.unidades.join(', ')})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="kz-label">Nombre</label><input className="kz-input" value={yo.nombre} onChange={e => setYo(y => ({ ...y, nombre: e.target.value }))} autoComplete="off" /></div>
              <div><label className="kz-label">Apellido</label><input className="kz-input" value={yo.apellido} onChange={e => setYo(y => ({ ...y, apellido: e.target.value }))} autoComplete="off" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="kz-label">Teléfono</label><input className="kz-input" inputMode="tel" value={yo.tel} onChange={e => setYo(y => ({ ...y, tel: e.target.value }))} placeholder="Ej: 099 123 456" autoComplete="off" /></div>
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
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 30px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
              <div style={{ position: 'relative', width: 340, maxWidth: '100%' }}>
                <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
                <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar apto"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 42px', fontSize: 16, borderRadius: 12, border: '1.5px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.06)', color: 'white', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div className="kz-aptos">
              {visibles.map(p => {
                const listo = acreditadas.has(p.label.toLowerCase())
                return (
                  <button key={p.label} disabled={listo} onClick={() => elegir(p)} className={`kz-persona ${listo ? 'listo' : ''}`} style={{ minHeight: 84, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 24, fontWeight: 800 }}>{p.num}</span>
                      {listo && <span className="kz-ok"><Check size={16} strokeWidth={3} /></span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: listo ? '#4ADE80' : '#8A9BB5', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {listo ? 'Registrada' : (q && p.torre ? (torres.find(t => t.codigo === p.torre)?.nombre || p.torre) : 'Tocá para registrarte')}
                    </div>
                  </button>
                )
              })}
            </div>
            {visibles.length === 0 && <div style={{ textAlign: 'center', color: '#8A9BB5', fontSize: 16, padding: 30 }}>No se encontró ninguna unidad.</div>}
          </div>
        </div>
      )}
      <style>{`.kz-aptos { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }`}</style>
    </Pantalla>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 30, overflowY: 'auto' }}><div style={{ width: '100%' }}>{children}</div></div>
}
