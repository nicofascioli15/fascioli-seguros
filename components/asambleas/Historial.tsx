'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, History, CalendarDays, Users, Printer, BookOpen, CheckCircle2, XCircle, ChevronRight, ArrowLeft, FileSignature } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import { fetchAsamblea } from '@/lib/asambleasData'
import { formatFechaAsamblea } from '@/lib/asambleas'
import { Pantalla } from '@/components/asambleas/Kiosco'

export type AsambleaPasada = {
  id: string; fecha: string; tipo: string; convocatoria: string; lugar: string | null; edificio: string
  presentes: number; porPoder: number; firmas: number
  mociones: { titulo: string; estado: string; aprobada: boolean | null; orden: number }[]
}

// Asambleas cerradas, con sus resoluciones y asistencia
export async function fetchHistorial(supabase: any): Promise<AsambleaPasada[]> {
  const { data, error } = await supabase.from('asambleas')
    .select('id, fecha, tipo, convocatoria, lugar, asam_edificios(nombre), asamblea_unidades(por_poder, firmo), asamblea_mociones(titulo, estado, aprobada, orden)')
    .eq('estado', 'cerrada').order('fecha', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((a: any) => ({
    id: a.id, fecha: a.fecha, tipo: a.tipo, convocatoria: a.convocatoria, lugar: a.lugar,
    edificio: a.asam_edificios?.nombre || 'Sin edificio',
    presentes: (a.asamblea_unidades || []).length,
    porPoder: (a.asamblea_unidades || []).filter((u: any) => u.por_poder).length,
    firmas: (a.asamblea_unidades || []).filter((u: any) => u.firmo).length,
    mociones: [...(a.asamblea_mociones || [])].sort((x: any, y: any) => x.orden - y.orden),
  }))
}

async function descargar(supabase: any, id: string, tipo: 'acta' | 'libro') {
  const d = await fetchAsamblea(supabase, id)
  if (!d) return
  if (tipo === 'acta') { const { imprimirActaPDF } = await import('@/lib/asambleaPdf'); await imprimirActaPDF(d) }
  else { const { imprimirLibroAsistencia } = await import('@/lib/libroAsistenciaPdf'); await imprimirLibroAsistencia(supabase, d) }
}

function useHistorial() {
  const supabase = createClient()
  const [filas, setFilas] = useState<AsambleaPasada[] | null>(null)
  useEffect(() => { fetchHistorial(supabase).then(setFilas).catch(e => { showToast(`No se pudo cargar el historial: ${e?.message || e}`, 'error'); setFilas([]) }) }, [])
  return filas
}

function filtrar(filas: AsambleaPasada[], q: string, anio: string) {
  const t = q.trim().toLowerCase()
  return filas.filter(f => (!anio || f.fecha.startsWith(anio)) && (!t || f.edificio.toLowerCase().includes(t) || f.mociones.some(m => m.titulo.toLowerCase().includes(t))))
}

// ── Vista computadora ─────────────────────────────────────────────────────
export function HistorialCompu() {
  const supabase = createClient()
  const router = useRouter()
  const filas = useHistorial()
  const [q, setQ] = useState('')
  const [anio, setAnio] = useState('')
  const [bajando, setBajando] = useState<string | null>(null)
  const anios = Array.from(new Set((filas || []).map(f => f.fecha.slice(0, 4)))).sort().reverse()
  const visibles = filtrar(filas || [], q, anio)

  async function pdf(id: string, tipo: 'acta' | 'libro') {
    setBajando(`${id}-${tipo}`)
    try { await descargar(supabase, id, tipo) } catch (e: any) { showToast(`No se pudo generar el PDF: ${e?.message || e}`, 'error') }
    setBajando(null)
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}><History size={22} /> Historial de asambleas</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Asambleas cerradas, con sus resoluciones, la asistencia con firmas y las actas.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar edificio o tema votado..." value={q} onChange={e => setQ(e.target.value)}
            style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
        </div>
        {anios.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`filter-btn ${!anio ? 'active' : ''}`} onClick={() => setAnio('')}>Todas</button>
            {anios.map(y => <button key={y} className={`filter-btn ${anio === y ? 'active' : ''}`} onClick={() => setAnio(y)}>{y}</button>)}
          </div>
        )}
      </div>

      {filas === null ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}><Loader2 size={22} className="spin" /></div>
        : visibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', fontSize: 13 }}>
            {filas.length === 0 ? 'Todavía no hay asambleas cerradas.' : 'Sin resultados'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibles.map(f => {
              const aprob = f.mociones.filter(m => m.estado === 'cerrada' && m.aprobada).length
              const rech = f.mociones.filter(m => m.estado === 'cerrada' && m.aprobada === false).length
              return (
                <div key={f.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240, cursor: 'pointer' }} onClick={() => router.push(`/asambleas/${f.id}`)}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{f.edificio}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <CalendarDays size={12} /> {formatFechaAsamblea(f.fecha)} · {f.tipo} · {f.convocatoria} convocatoria{f.lugar ? ` · ${f.lugar}` : ''}
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {f.presentes} unidades ({f.porPoder} por poder)</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileSignature size={12} /> {f.firmas} firmas</span>
                        <span style={{ color: '#15803D', fontWeight: 700 }}>{aprob} aprobadas</span>
                        <span style={{ color: '#B91C1C', fontWeight: 700 }}>{rech} rechazadas</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-outline btn-sm" onClick={() => pdf(f.id, 'acta')} disabled={!!bajando}>{bajando === `${f.id}-acta` ? <Loader2 size={13} className="spin" /> : <Printer size={13} />} Acta</button>
                      <button className="btn-outline btn-sm" onClick={() => pdf(f.id, 'libro')} disabled={!!bajando}>{bajando === `${f.id}-libro` ? <Loader2 size={13} className="spin" /> : <BookOpen size={13} />} Libro de asistencia</button>
                      <button className="btn-primary btn-sm" onClick={() => router.push(`/asambleas/${f.id}`)}>Ver <ChevronRight size={13} /></button>
                    </div>
                  </div>
                  {f.mociones.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {f.mociones.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          {m.estado !== 'cerrada' ? <span style={{ color: 'var(--text-muted)', fontSize: 12, width: 82 }}>No se votó</span>
                            : m.aprobada ? <span style={{ color: '#15803D', fontWeight: 800, fontSize: 12, width: 82, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={13} /> Aprobada</span>
                            : <span style={{ color: '#B91C1C', fontWeight: 800, fontSize: 12, width: 82, display: 'flex', alignItems: 'center', gap: 3 }}><XCircle size={13} /> Rechazada</span>}
                          <span>{m.titulo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

// ── Vista táctil ──────────────────────────────────────────────────────────
export function HistorialTactil({ onVolver }: { onVolver?: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const filas = useHistorial()
  const [q, setQ] = useState('')
  const [anio, setAnio] = useState('')
  const [bajando, setBajando] = useState<string | null>(null)
  const anios = Array.from(new Set((filas || []).map(f => f.fecha.slice(0, 4)))).sort().reverse()
  const visibles = filtrar(filas || [], q, anio)
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev } }, [])

  async function pdf(id: string, tipo: 'acta' | 'libro') {
    setBajando(`${id}-${tipo}`)
    try { await descargar(supabase, id, tipo) } catch (e: any) { showToast(`No se pudo generar el PDF: ${e?.message || e}`, 'error') }
    setBajando(null)
  }

  return (
    <Pantalla>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#0A1526' }}>
        <button className="kz-mini" onClick={() => (onVolver ? onVolver() : router.push('/asambleas'))}><ArrowLeft size={15} /> Asambleas</button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><History size={18} color="#E2C47A" /> Asambleas pasadas</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
            <input className="kz-input" style={{ paddingLeft: 48 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar edificio o tema votado" />
          </div>
          {anios.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className={`kz-opcion ${!anio ? 'sel' : ''}`} style={{ flex: 'none', padding: '10px 16px', fontSize: 15 }} onClick={() => setAnio('')}>Todas</button>
              {anios.map(y => <button key={y} className={`kz-opcion ${anio === y ? 'sel' : ''}`} style={{ flex: 'none', padding: '10px 16px', fontSize: 15 }} onClick={() => setAnio(y)}>{y}</button>)}
            </div>
          )}
          {filas === null ? <div style={{ textAlign: 'center', padding: 30 }}><Loader2 size={28} className="spin" /></div>
            : visibles.length === 0 ? <div style={{ textAlign: 'center', color: '#8A9BB5', fontSize: 16, padding: 20 }}>{filas.length ? 'Sin resultados' : 'Todavía no hay asambleas cerradas.'}</div>
            : visibles.map(f => {
              const aprob = f.mociones.filter(m => m.estado === 'cerrada' && m.aprobada).length
              const rech = f.mociones.filter(m => m.estado === 'cerrada' && m.aprobada === false).length
              return (
                <div key={f.id} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, padding: 16 }}>
                  <button style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }} onClick={() => router.push(`/asambleas/${f.id}/sala`)}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{f.edificio}</div>
                    <div style={{ fontSize: 14, color: '#B8C5D6', marginTop: 2 }}>{formatFechaAsamblea(f.fecha)} · {f.tipo} · {f.presentes} unidades · {f.firmas} firmas</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 14, fontWeight: 800 }}>
                      <span style={{ color: '#4ADE80' }}>{aprob} aprobadas</span><span style={{ color: '#F87171' }}>{rech} rechazadas</span>
                    </div>
                    {f.mociones.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {f.mociones.map((m, i) => (
                          <div key={i} style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                            {m.estado !== 'cerrada' ? <span style={{ color: '#8A9BB5' }}>•</span> : m.aprobada ? <CheckCircle2 size={15} color="#4ADE80" /> : <XCircle size={15} color="#F87171" />}
                            <span style={{ color: m.estado === 'cerrada' ? 'white' : '#8A9BB5' }}>{m.titulo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="kz-mini" onClick={() => pdf(f.id, 'acta')} disabled={!!bajando}>{bajando === `${f.id}-acta` ? <Loader2 size={14} className="spin" /> : <Printer size={14} />} Acta</button>
                    <button className="kz-mini" onClick={() => pdf(f.id, 'libro')} disabled={!!bajando}>{bajando === `${f.id}-libro` ? <Loader2 size={14} className="spin" /> : <BookOpen size={14} />} Libro de asistencia</button>
                    <button className="kz-mini" style={{ marginLeft: 'auto' }} onClick={() => router.push(`/asambleas/${f.id}/sala`)}>Ver <ChevronRight size={14} /></button>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </Pantalla>
  )
}
