'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Search, ArrowLeft, Check, Monitor, Vote, CalendarDays, Users, ChevronRight, Building2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { traerTodo } from '@/lib/traerTodo'
import { hoyLocal } from '@/lib/obrasConfig'
import { Pantalla } from '@/components/asambleas/Kiosco'
import { elegirVista } from '@/hooks/useVistaTactil'
import { MODOS_CONTEO, formatFechaAsamblea, type ModoConteo } from '@/lib/asambleas'

type Fila = { id: string; fecha: string; tipo: string; estado: string; edificio: string; n_unidades: number; n_mociones: number }
type Edificio = { id: string; nombre: string; direccion: string | null; codigo: string | null; unidades: number }

// Asambleas en "modo app": todo táctil, para celular y tablet. Al tocar una asamblea se entra al modo sala.
export default function AsambleasTactil() {
  const supabase = createClient()
  const router = useRouter()
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [nueva, setNueva] = useState(false)
  const [verCerradas, setVerCerradas] = useState(false)

  useEffect(() => {
    supabase.from('asambleas').select('id, fecha, tipo, estado, asam_edificios(nombre), asamblea_unidades(count), asamblea_mociones(count)')
      .order('fecha', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }: any) => setFilas((data || []).map((a: any) => ({ ...a, edificio: a.asam_edificios?.nombre || 'Sin edificio', n_unidades: a.asamblea_unidades?.[0]?.count ?? 0, n_mociones: a.asamblea_mociones?.[0]?.count ?? 0 }))))
  }, [])
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev } }, [])

  function verCompu() { elegirVista('compu'); window.location.reload() }

  const abiertas = (filas || []).filter(f => f.estado === 'abierta')
  const cerradas = (filas || []).filter(f => f.estado !== 'abierta')

  if (nueva) return <NuevaAsambleaTactil onCerrar={() => setNueva(false)} onCreada={id => router.push(`/asambleas/${id}/sala`)} />

  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526' }}>
        <button className="kz-mini" onClick={() => router.push('/hub')}><ArrowLeft size={15} /> Portal</button>
        <img src="/logo-fascioli.svg" alt="Fascioli" style={{ height: 22 }} />
        <div style={{ flex: 1 }} />
        <button className="kz-mini" onClick={verCompu}><Monitor size={14} /> Vista computadora</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 18px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#E2C47A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Asambleas</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>¿Qué asamblea vamos a hacer?</div>
            </div>
          </div>
          <button className="kz-confirmar" style={{ marginTop: 0 }} onClick={() => setNueva(true)}><Plus size={26} strokeWidth={3} /> Nueva asamblea</button>

          {filas === null ? <div style={{ textAlign: 'center', padding: 30 }}><Loader2 size={28} className="spin" /></div> : (
            <>
              {abiertas.length > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 8 }}>Abiertas</div>}
              {abiertas.map(f => <TarjetaAsamblea key={f.id} f={f} onClick={() => router.push(`/asambleas/${f.id}/sala`)} />)}
              {abiertas.length === 0 && <div style={{ color: '#8A9BB5', fontSize: 16, textAlign: 'center', padding: 10 }}>No hay asambleas abiertas.</div>}
              {cerradas.length > 0 && (
                <button className="kz-mini" style={{ alignSelf: 'center', marginTop: 8 }} onClick={() => setVerCerradas(v => !v)}>{verCerradas ? 'Ocultar' : 'Ver'} asambleas cerradas ({cerradas.length})</button>
              )}
              {verCerradas && cerradas.map(f => <TarjetaAsamblea key={f.id} f={f} onClick={() => router.push(`/asambleas/${f.id}/sala`)} />)}
            </>
          )}
        </div>
      </div>
    </Pantalla>
  )
}

function TarjetaAsamblea({ f, onClick }: { f: Fila; onClick: () => void }) {
  const abierta = f.estado === 'abierta'
  return (
    <button onClick={onClick} className="kz-persona" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderColor: abierta ? 'rgba(226,196,122,.5)' : undefined }}>
      <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Vote size={26} color="#E2C47A" /></div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{f.edificio}</div>
        <div style={{ fontSize: 14, color: '#B8C5D6', display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          <CalendarDays size={14} /> {formatFechaAsamblea(f.fecha)} · {f.tipo}
          <span style={{ opacity: .5 }}>·</span><Users size={14} /> {f.n_unidades} · {f.n_mociones} mociones
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, padding: '5px 10px', borderRadius: 999, background: abierta ? 'rgba(226,196,122,.18)' : 'rgba(74,222,128,.15)', color: abierta ? '#E2C47A' : '#4ADE80' }}>{abierta ? 'Abierta' : 'Cerrada'}</span>
      <ChevronRight size={22} color="#8A9BB5" />
    </button>
  )
}

// Nueva asamblea paso a paso, todo táctil
function NuevaAsambleaTactil({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: (id: string) => void }) {
  const supabase = createClient()
  const [paso, setPaso] = useState(1)
  const [edificios, setEdificios] = useState<Edificio[] | null>(null)
  const [buscar, setBuscar] = useState('')
  const [ed, setEd] = useState<Edificio | null>(null)
  const [f, setF] = useState({ fecha: hoyLocal(), tipo: 'Ordinaria', convocatoria: 'Primera', modo_conteo: 'unidad' as ModoConteo, total_unidades: '', lugar: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([
      traerTodo<any>(() => supabase.from('asam_edificios').select('id, nombre, direccion, codigo').order('nombre').order('id')),
      traerTodo<any>(() => supabase.from('asam_unidades').select('edificio_id').order('id')).catch(() => []),
    ]).then(([eds, us]) => {
      const n: Record<string, number> = {}
      us.forEach((u: any) => { n[u.edificio_id] = (n[u.edificio_id] || 0) + 1 })
      setEdificios(eds.map((e: any) => ({ ...e, unidades: n[e.id] || 0 })))
    })
  }, [])

  function elegir(e: Edificio) { setEd(e); setF(x => ({ ...x, total_unidades: e.unidades ? String(e.unidades) : '' })); setPaso(2) }

  async function crear() {
    if (!ed) return
    setGuardando(true)
    const payload = { edificio_id: ed.id, fecha: f.fecha || hoyLocal(), tipo: f.tipo, convocatoria: f.convocatoria, modo_conteo: f.modo_conteo, total_unidades: parseInt(f.total_unidades) || null, total_coeficiente: 100, lugar: f.lugar.trim() || null }
    const { data, error } = await supabase.from('asambleas').insert([payload]).select().single()
    setGuardando(false)
    if (error || !data) { showToast(`No se pudo crear: ${error?.message || ''}`, 'error'); return }
    await registrarAudit({ accion: 'crear', tabla: 'asambleas', registroId: data.id, descripcion: `Asamblea ${f.tipo.toLowerCase()} creada — ${ed.nombre} (${formatFechaAsamblea(payload.fecha)})`, datosDespues: data })
    onCreada(data.id)
  }

  const q = buscar.trim().toLowerCase()
  const visibles = (edificios || []).filter(e => !q || e.nombre.toLowerCase().includes(q) || (e.direccion || '').toLowerCase().includes(q) || (e.codigo || '').toLowerCase().includes(q))
  const opcion = (sel: boolean) => `kz-opcion ${sel ? 'sel' : ''}`

  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526' }}>
        <button className="kz-mini" onClick={() => (paso > 1 ? setPaso(p => p - 1) : onCerrar())}><ArrowLeft size={15} /> {paso > 1 ? 'Atrás' : 'Cancelar'}</button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 800 }}>Nueva asamblea · paso {paso} de 3</div>
        <button className="kz-mini" onClick={onCerrar}><X size={15} /></button>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.08)' }}><div style={{ height: '100%', width: `${(paso / 3) * 100}%`, background: '#E2C47A', transition: 'width .3s' }} /></div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 18px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {paso === 1 && (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>¿En qué edificio?</div>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
                <input className="kz-input" style={{ paddingLeft: 48 }} value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre, dirección o código" />
              </div>
              {edificios === null ? <div style={{ textAlign: 'center', padding: 30 }}><Loader2 size={28} className="spin" /></div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {visibles.slice(0, 80).map(e => (
                    <button key={e.id} className="kz-persona" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, minHeight: 0 }} onClick={() => elegir(e)}>
                      <Building2 size={22} color="#E2C47A" />
                      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 800 }}>{e.nombre}</div>
                        <div style={{ fontSize: 13, color: '#8A9BB5' }}>{[e.codigo, e.direccion].filter(Boolean).join(' · ')}</div>
                      </div>
                      <span style={{ fontSize: 13, color: e.unidades ? '#4ADE80' : '#8A9BB5', fontWeight: 700 }}>{e.unidades ? `${e.unidades} aptos` : 'sin aptos'}</span>
                    </button>
                  ))}
                  {visibles.length === 0 && <div style={{ textAlign: 'center', color: '#8A9BB5', padding: 20 }}>No se encontró ningún edificio.</div>}
                </div>
              )}
            </>
          )}

          {paso === 2 && ed && (
            <>
              <div style={{ fontSize: 15, color: '#E2C47A', fontWeight: 800 }}>{ed.nombre}</div>
              <div style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 18px' }}>Datos de la asamblea</div>
              <label className="kz-label">Fecha</label>
              <input className="kz-input" type="date" value={f.fecha} onChange={e => setF(x => ({ ...x, fecha: e.target.value }))} />
              <div style={{ height: 16 }} />
              <label className="kz-label">Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Ordinaria', 'Extraordinaria'].map(t => <button key={t} className={opcion(f.tipo === t)} onClick={() => setF(x => ({ ...x, tipo: t }))}>{t}</button>)}
              </div>
              <div style={{ height: 16 }} />
              <label className="kz-label">Convocatoria</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Primera', 'Segunda'].map(t => <button key={t} className={opcion(f.convocatoria === t)} onClick={() => setF(x => ({ ...x, convocatoria: t }))}>{t}</button>)}
              </div>
              <div style={{ height: 16 }} />
              <label className="kz-label">Lugar (opcional)</label>
              <input className="kz-input" value={f.lugar} onChange={e => setF(x => ({ ...x, lugar: e.target.value }))} placeholder="Ej: Hall del edificio" />
              <button className="kz-confirmar" onClick={() => setPaso(3)}>Siguiente <ChevronRight size={24} /></button>
            </>
          )}

          {paso === 3 && ed && (
            <>
              <div style={{ fontSize: 15, color: '#E2C47A', fontWeight: 800 }}>{ed.nombre}</div>
              <div style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 18px' }}>¿Cómo se cuentan los votos?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MODOS_CONTEO.map(m => (
                  <button key={m.value} className={opcion(f.modo_conteo === m.value)} style={{ flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: 4 }} onClick={() => setF(x => ({ ...x, modo_conteo: m.value }))}>
                    <span>{m.label}</span><span style={{ fontSize: 14, fontWeight: 600, color: '#B8C5D6' }}>{m.ayuda}</span>
                  </button>
                ))}
              </div>
              <div style={{ height: 18 }} />
              <label className="kz-label">Unidades del edificio</label>
              <input className="kz-input" inputMode="numeric" value={f.total_unidades} onChange={e => setF(x => ({ ...x, total_unidades: e.target.value.replace(/\D/g, '') }))} placeholder="Ej: 24" />
              <div style={{ fontSize: 13, color: '#8A9BB5', marginTop: 6 }}>Para el quórum y las mayorías sobre el total del edificio.</div>
              <button className="kz-confirmar" onClick={crear} disabled={guardando}>{guardando ? <Loader2 size={24} className="spin" /> : <><Check size={26} strokeWidth={3} /> Crear y empezar</>}</button>
            </>
          )}
        </div>
      </div>
    </Pantalla>
  )
}
