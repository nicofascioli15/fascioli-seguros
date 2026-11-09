'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, BookOpen, Copy, Loader2, Users, UserCheck, FileSignature, Plus, Trash2, Tablet, Lock, Unlock, Printer, ListChecks, CheckCircle2, XCircle, ChevronDown, ChevronUp, Pencil, X, AlertTriangle, Vote } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import SalaQR from '@/components/asambleas/SalaQR'
import { fetchAsamblea, cerrarVotacion, type AsambleaCompleta } from '@/lib/asambleasData'
import { traerPadron } from '@/lib/padronImport'
import {
  MAYORIAS, BASES, MODOS_CONTEO, VOTOS, calcularResultado, quorum, votante, mayoriaLabel, baseLabel, formatFechaAsamblea,
  type Mayoria, type BaseMayoria, type Mocion, type UnidadAsamblea, type ModoConteo,
} from '@/lib/asambleas'

type Tab = 'acreditacion' | 'mociones'

export default function AsambleaFichaPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()
  const [d, setD] = useState<AsambleaCompleta | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('acreditacion')
  const [confirm, setConfirm] = useState<null | { titulo: string; mensaje: React.ReactNode; accion: () => Promise<void>; label?: string; tono?: 'danger' | 'neutral' }>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [libro, setLibro] = useState(false)

  useEffect(() => { cargar() }, [id])
  async function cargar() { setD(await fetchAsamblea(supabase, id)) }

  // Mientras hay una votación abierta, se refresca solo (por si se vota desde otra tablet).
  const hayVotando = !!d?.mociones.some(m => m.estado === 'votando')
  useEffect(() => {
    if (!hayVotando) return
    const t = setInterval(cargar, 4000)
    return () => clearInterval(t)
  }, [hayVotando, id])

  if (d === undefined) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={24} className="spin" /></div>
  if (d === null) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>No se encontró la asamblea</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Si recién instalaste el módulo, revisá que esté corrido el SQL de asambleas.</div>
      <Link href="/asambleas" className="btn-outline">Volver a Asambleas</Link>
    </div>
  )

  const { asamblea: a } = d
  const cerrada = a.estado === 'cerrada'
  const q = quorum(a, d.unidades)
  const usaCoef = a.modo_conteo !== 'unidad'
  const etiqueta = `${d.edificio} (${formatFechaAsamblea(a.fecha)})`

  async function ejecutar(fn: () => Promise<void>) {
    setTrabajando(true)
    try { await fn() } finally { setTrabajando(false); setConfirm(null) }
  }

  async function cambiarEstadoAsamblea(estado: 'abierta' | 'cerrada') {
    if (estado === 'cerrada' && d!.mociones.some(m => m.estado === 'votando')) { showToast('Primero cerrá las votaciones que siguen abiertas', 'error'); return }
    const { error } = await supabase.from('asambleas').update({ estado }).eq('id', a.id)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'asambleas', registroId: a.id, descripcion: `Asamblea ${estado === 'cerrada' ? 'cerrada' : 'reabierta'} — ${etiqueta}`, datosAntes: { estado: a.estado }, datosDespues: { estado } })
    await cargar()
  }

  async function eliminarAsamblea() {
    const { error } = await supabase.from('asambleas').delete().eq('id', a.id)
    if (error) { showToast(error.message, 'error'); return }
    const firmas = Array.from(new Set(d!.unidades.map(u => u.firma_path).filter(Boolean) as string[]))
    if (firmas.length) await supabase.storage.from('documentos').remove(firmas)
    await registrarAudit({ accion: 'eliminar', tabla: 'asambleas', registroId: a.id, descripcion: `Asamblea eliminada — ${etiqueta}`, datosAntes: a })
    router.push('/asambleas')
  }

  async function imprimirLibro() {
    setLibro(true)
    try {
      const { imprimirLibroAsistencia } = await import('@/lib/libroAsistenciaPdf')
      const fresco = await fetchAsamblea(supabase, a.id)
      if (fresco) await imprimirLibroAsistencia(supabase, fresco)
    } catch (e: any) { showToast(`No se pudo generar el libro: ${e?.message || e}`, 'error') }
    setLibro(false)
  }

  async function imprimir() {
    setImprimiendo(true)
    try {
      const { imprimirActaPDF } = await import('@/lib/asambleaPdf')
      const fresco = await fetchAsamblea(supabase, a.id)
      if (fresco) await imprimirActaPDF(fresco)
    } catch (e: any) { showToast(`No se pudo generar el PDF: ${e?.message || e}`, 'error') }
    setImprimiendo(false)
  }

  return (
    <div>
      <Link href="/asambleas" className="btn-outline btn-sm" style={{ marginBottom: 14, display: 'inline-flex' }}><ArrowLeft size={13} /> Asambleas</Link>

      {/* Encabezado */}
      <div style={{ background: 'var(--navy)', color: 'white', borderRadius: 16, padding: '22px 24px', marginBottom: 14, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className={`badge ${cerrada ? 'badge-success' : 'badge-gold'}`}>{cerrada ? 'Cerrada' : 'Abierta'}</span>
            <span className="badge badge-neutral">{a.tipo} · {a.convocatoria} convocatoria</span>
            <span className="badge badge-neutral">{MODOS_CONTEO.find(m => m.value === a.modo_conteo)?.label}</span>
          </div>
          <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.2 }}>Asamblea {d.edificio}</div>
          <div style={{ fontSize: 13, color: '#B8C5D6', marginTop: 6 }}>{formatFechaAsamblea(a.fecha)}{a.lugar ? ` · ${a.lugar}` : ''}{d.direccion ? ` · ${d.direccion}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={imprimir} disabled={imprimiendo}>{imprimiendo ? <Loader2 size={13} className="spin" /> : <Printer size={13} />} Acta PDF</button>
          <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={imprimirLibro} disabled={libro}>{libro ? <Loader2 size={13} className="spin" /> : <BookOpen size={13} />} Libro de asistencia</button>
          {!cerrada && <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={() => setEditando(true)}><Pencil size={13} /> Datos</button>}
          {cerrada
            ? <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={() => setConfirm({ titulo: '¿Reabrir la asamblea?', mensaje: 'Se van a poder volver a acreditar unidades y votar.', label: 'Reabrir', tono: 'neutral', accion: () => cambiarEstadoAsamblea('abierta') })}><Unlock size={13} /> Reabrir</button>
            : <button className="btn-outline btn-sm" style={{ background: 'rgba(226,196,122,.15)', color: '#E2C47A', borderColor: 'rgba(226,196,122,.4)' }} onClick={() => setConfirm({ titulo: '¿Cerrar la asamblea?', mensaje: 'Ya no se van a poder acreditar unidades ni votar. Se puede reabrir después.', label: 'Cerrar asamblea', tono: 'neutral', accion: () => cambiarEstadoAsamblea('cerrada') })}><Lock size={13} /> Cerrar asamblea</button>}
          <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: '#FCA5A5', borderColor: 'rgba(252,165,165,.35)' }} title="Eliminar asamblea" onClick={() => setConfirm({ titulo: '¿Eliminar la asamblea?', mensaje: 'Se borran las unidades acreditadas, las mociones y todos los votos. No se puede deshacer.', label: 'Eliminar', accion: eliminarAsamblea })}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Quórum */}
      <div className="asam-kpis">
        <Kpi label="Unidades acreditadas" valor={`${q.presentes}${a.total_unidades ? ` de ${a.total_unidades}` : ''}`} sub={q.pctUnidades != null ? `${Math.round(q.pctUnidades * 100)}% del edificio` : 'cargá el total de unidades en "Datos"'} />
        <Kpi label="Presentes" valor={String(q.presentes - q.porPoder)} sub="en persona" />
        <Kpi label="Por poder" valor={String(q.porPoder)} sub="representadas" />
        {usaCoef && <Kpi label="Coeficiente presente" valor={`${q.coef}%`} sub={q.pctCoef != null ? `${Math.round(q.pctCoef * 100)}% del total (${a.total_coeficiente}%)` : ''} />}
        <Kpi label="Mociones" valor={String(d.mociones.length)} sub={`${d.mociones.filter(m => m.estado === 'cerrada').length} votadas`} />
      </div>

      {!cerrada && <TabletLink codigo={a.codigo_tablet} hayVotando={hayVotando} />}
      {!cerrada && a.codigo_sala && <SalaQR codigo={a.codigo_sala} edificio={d.edificio} fecha={a.fecha} />}
      {!cerrada && a.codigo_tablet && !a.codigo_sala && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#FEF3C7', color: '#92400E', borderRadius: 12, padding: '11px 14px', fontSize: 13, marginBottom: 14 }}>
          <AlertTriangle size={16} /> Falta correr el SQL del celular (schema_asambleas_v5_celular.sql) para tener el QR de la sala.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {([['acreditacion', 'Acreditación', UserCheck, d.unidades.length], ['mociones', 'Mociones y votación', ListChecks, d.mociones.length]] as const).map(([k, label, Icon, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: tab === k ? 800 : 600, color: tab === k ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: `2px solid ${tab === k ? 'var(--gold)' : 'transparent'}`, marginBottom: -1 }}>
            <Icon size={15} /> {label} <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>({n})</span>
          </button>
        ))}
      </div>

      {tab === 'acreditacion'
        ? <Acreditacion d={d} cerrada={cerrada} onChange={cargar} etiqueta={etiqueta} pedirConfirm={setConfirm} />
        : <Mociones d={d} cerrada={cerrada} onChange={cargar} etiqueta={etiqueta} pedirConfirm={setConfirm} irAAcreditar={() => setTab('acreditacion')} />}

      {editando && <EditarDatos d={d} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); cargar() }} />}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.titulo || ''}
        message={confirm?.mensaje}
        confirmLabel={confirm?.label}
        tone={confirm?.tono}
        loading={trabajando}
        onConfirm={() => confirm && ejecutar(confirm.accion)}
        onCancel={() => setConfirm(null)}
      />

      <style>{`
        .asam-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .asam-tabla { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .asam-tabla th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding: 9px 12px; background: var(--bg-card-alt); }
        .asam-tabla td { padding: 10px 12px; border-top: 1px solid var(--border-soft); vertical-align: middle; }
      `}</style>
    </div>
  )
}

function Kpi({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '13px 15px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, marginTop: 3 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

type PedirConfirm = (c: { titulo: string; mensaje: React.ReactNode; accion: () => Promise<void>; label?: string; tono?: 'danger' | 'neutral' } | null) => void

// ── Acreditación: se cargan solo las unidades presentes o representadas ──────
function Acreditacion({ d, cerrada, onChange, etiqueta, pedirConfirm }: { d: AsambleaCompleta; cerrada: boolean; onChange: () => void; etiqueta: string; pedirConfirm: PedirConfirm }) {
  const supabase = createClient()
  const usaCoef = d.asamblea.modo_conteo !== 'unidad'
  const vacio = { unidad: '', propietario: '', coeficiente: '', por_poder: false, apoderado: '' }
  const [f, setF] = useState(vacio)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const refUnidad = useRef<any>(null)
  const set = (c: Partial<typeof f>) => setF(x => ({ ...x, ...c }))

  // Padrón del edificio (Edificios y unidades): sugiere las unidades y completa propietario y coeficiente.
  type Padron = { label: string; torre: string; num: string; propietario: string | null; coeficiente: number | null }
  const [padron, setPadron] = useState<Padron[]>([])
  const [torresPadron, setTorresPadron] = useState<{ codigo: string; nombre: string | null }[]>([])
  const [torreSel, setTorreSel] = useState('')
  const [manual, setManual] = useState(false)          // "otra unidad": se escribe a mano
  const [padronCargado, setPadronCargado] = useState(false)
  useEffect(() => {
    traerPadron(supabase, d.asamblea.edificio_id).then(p => {
      setPadron(p.unidades)
      setTorresPadron(p.torres)
      setPadronCargado(true)
      if (p.torres.length && !p.unidades.some(u => !u.torre)) setTorreSel(p.torres[0].codigo)
    }).catch(() => setPadronCargado(true))
  }, [d.asamblea.edificio_id])
  const hayTorres = torresPadron.length > 0
  const usarLista = padron.length > 0 && !manual
  const enPadron = (txt: string) => padron.find(p => p.label.toLowerCase() === txt.trim().toLowerCase())
  const delPadron = enPadron(f.unidad)
  const acreditadas = new Set(d.unidades.map(u => u.unidad.toLowerCase()))

  function cambiarUnidad(v: string) {
    const p = enPadron(v)
    setF(x => ({
      ...x, unidad: v,
      ...(p && !editId ? {
        coeficiente: x.coeficiente || (p.coeficiente != null ? String(p.coeficiente) : ''),
      } : {}),
    }))
  }
  const conVotos = new Set(d.votos.map(v => v.unidad_id))

  // Nombres ya cargados, para sugerir el apoderado (una persona con varios poderes).
  const nombres = Array.from(new Set(d.unidades.flatMap(u => [u.propietario, u.apoderado]).filter(Boolean) as string[])).sort()

  async function guardar() {
    const unidad = f.unidad.trim()
    if (!unidad) { showToast('Poné el número de unidad', 'error'); refUnidad.current?.focus(); return }
    if (f.por_poder && !f.apoderado.trim()) { showToast('Poné quién la representa (el que trae el poder)', 'error'); return }
    if (!f.por_poder && !f.propietario.trim()) { showToast('Poné el nombre del propietario presente', 'error'); return }
    const coef = f.coeficiente.trim() ? parseFloat(f.coeficiente.replace(',', '.')) : null
    if (usaCoef && (coef == null || isNaN(coef) || coef <= 0)) { showToast('Esta asamblea cuenta por coeficiente: poné el coeficiente de la unidad', 'error'); return }
    setSaving(true)
    // Por poder solo interesa la unidad y quién firma y vota por ella (no el nombre del propietario).
    const payload = { unidad, propietario: f.por_poder ? null : (f.propietario.trim() || null), coeficiente: coef, por_poder: f.por_poder, apoderado: f.por_poder ? f.apoderado.trim() : null }
    if (editId) {
      const antes = d.unidades.find(u => u.id === editId)
      const { error } = await supabase.from('asamblea_unidades').update(payload).eq('id', editId)
      setSaving(false)
      if (error) { showToast(error.message.includes('duplicate') ? `La unidad ${unidad} ya está acreditada` : error.message, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'asamblea_unidades', registroId: editId, descripcion: `Unidad ${unidad} editada — ${etiqueta}`, datosAntes: antes, datosDespues: payload })
    } else {
      const { data, error } = await supabase.from('asamblea_unidades').insert([{ ...payload, asamblea_id: d.asamblea.id }]).select().single()
      setSaving(false)
      if (error) { showToast(error.message.includes('duplicate') ? `La unidad ${unidad} ya está acreditada` : error.message, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'asamblea_unidades', registroId: data?.id, descripcion: `Unidad ${unidad} acreditada${f.por_poder ? ` por poder (${payload.apoderado})` : ''} — ${etiqueta}`, datosDespues: data })
      showToast(`Unidad ${unidad} acreditada`, 'success')
    }
    // Si viene alguien con varios poderes, se mantiene el apoderado para cargar la siguiente más rápido.
    setF(f.por_poder ? { ...vacio, por_poder: true, apoderado: f.apoderado } : vacio)
    setEditId(null)
    setManual(false)
    onChange()
    setTimeout(() => refUnidad.current?.focus(), 50)
  }

  function editar(u: UnidadAsamblea) {
    setEditId(u.id)
    setF({ unidad: u.unidad, propietario: u.propietario || '', coeficiente: u.coeficiente != null ? String(u.coeficiente) : '', por_poder: u.por_poder, apoderado: u.apoderado || '' })
    const p = enPadron(u.unidad)
    if (p) { setTorreSel(p.torre); setManual(false) } else if (padron.length) setManual(true)
    refUnidad.current?.focus()
  }

  function quitar(u: UnidadAsamblea) {
    pedirConfirm({
      titulo: `¿Quitar la unidad ${u.unidad}?`,
      mensaje: conVotos.has(u.id) ? 'Esta unidad ya votó: también se borran sus votos.' : 'Se saca de la lista de acreditadas.',
      label: 'Quitar',
      accion: async () => {
        const { error } = await supabase.from('asamblea_unidades').delete().eq('id', u.id)
        if (error) { showToast(error.message, 'error'); return }
        // La firma se borra del almacenamiento si ninguna otra unidad la usa (poderes comparten firma)
        if (u.firma_path && !d.unidades.some(x => x.id !== u.id && x.firma_path === u.firma_path)) await supabase.storage.from('documentos').remove([u.firma_path])
        await registrarAudit({ accion: 'eliminar', tabla: 'asamblea_unidades', registroId: u.id, descripcion: `Unidad ${u.unidad} quitada de la asamblea — ${etiqueta}`, datosAntes: u })
        onChange()
      },
    })
  }

  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); guardar() } }
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!cerrada && padronCargado && padron.length === 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-card-alt)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 240 }}>{d.asamblea.edificio_id ? <>Este edificio no tiene unidades cargadas, por eso no aparece la lista ni el autorregistro en la tablet. Cargalas en <Link href={`/asambleas/edificios/${d.asamblea.edificio_id}`} style={{ color: 'var(--gold)', fontWeight: 700 }}>la ficha del edificio</Link>.</> : <>Esta asamblea no tiene edificio asignado (era de antes del cambio). Creala de nuevo eligiendo el edificio.</>}</span>
        </div>
      )}
      {!cerrada && (
        <div style={{ background: 'var(--bg-card)', border: `1.5px solid ${editId ? 'var(--gold)' : 'var(--border-soft)'}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>{editId ? 'Editar unidad' : padron.length ? 'Acreditar desde la computadora' : 'Acreditar unidad'}</div>
          <div className="acred-grid" style={{ gridTemplateColumns: [usarLista && hayTorres ? 'minmax(150px, 1fr)' : null, usarLista ? 'minmax(190px, 1.2fr)' : '110px', '1.4fr', usaCoef ? '120px' : null].filter(Boolean).join(' ') }}>
            {usarLista && hayTorres && (
              <div className="fgroup" style={{ margin: 0 }}><label>Torre *</label>
                <select style={inp} value={torreSel} onChange={e => { setTorreSel(e.target.value); cambiarUnidad('') }}>
                  {padron.some(u => !u.torre) && <option value="">Sin torre</option>}
                  {torresPadron.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre ? `${t.nombre} (${t.codigo})` : t.codigo}</option>)}
                </select></div>
            )}
            {usarLista ? (
              <div className="fgroup" style={{ margin: 0 }}><label>Unidad *</label>
                <select ref={refUnidad} style={inp} value={f.unidad} autoFocus
                  onChange={e => { if (e.target.value === '__otra') { setManual(true); cambiarUnidad(''); setTimeout(() => refUnidad.current?.focus(), 30) } else cambiarUnidad(e.target.value) }}>
                  <option value="">— Elegí la unidad —</option>
                  {padron.filter(p => p.torre === torreSel && (!acreditadas.has(p.label.toLowerCase()) || p.label === f.unidad)).map(p => (
                    <option key={p.label} value={p.label}>{p.num}</option>
                  ))}
                  <option value="__otra">✎ Otra unidad (no está en la lista)</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{padron.filter(p => p.torre === torreSel && !acreditadas.has(p.label.toLowerCase())).length} sin acreditar</div>
              </div>
            ) : (
              <div className="fgroup" style={{ margin: 0 }}><label>Unidad *</label><input ref={refUnidad} style={inp} value={f.unidad} onChange={e => cambiarUnidad(e.target.value)} onKeyDown={onEnter} placeholder="Ej: 302" autoFocus />
                {padron.length > 0 && <button type="button" onClick={() => { setManual(false); cambiarUnidad('') }} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 700, fontSize: 11.5, cursor: 'pointer', padding: '3px 0 0', fontFamily: 'inherit' }}>← Elegir de la lista</button>}
              </div>
            )}
            {!f.por_poder
              ? <div className="fgroup" style={{ margin: 0 }}><label>Propietario presente *</label><input style={inp} value={f.propietario} onChange={e => set({ propietario: e.target.value })} onKeyDown={onEnter} placeholder="Nombre y apellido" list="asam-nombres" /></div>
              : <div className="fgroup" style={{ margin: 0 }}><label>Firma y vota (trae el poder) *</label><input style={inp} value={f.apoderado} onChange={e => set({ apoderado: e.target.value })} onKeyDown={onEnter} placeholder="Nombre y apellido" list="asam-nombres" /></div>}
            {usaCoef && <div className="fgroup" style={{ margin: 0 }}><label>Coeficiente % *</label><input style={inp} inputMode="decimal" value={f.coeficiente} onChange={e => set({ coeficiente: e.target.value })} onKeyDown={onEnter} placeholder="Ej: 4,25" /></div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '8px 12px', borderRadius: 9, border: `1.5px solid ${f.por_poder ? 'var(--gold)' : 'var(--border)'}`, background: f.por_poder ? 'var(--gold-pale)' : 'var(--bg-card)' }}>
              <input type="checkbox" checked={f.por_poder} onChange={e => set({ por_poder: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#C9A84C' }} />
              <FileSignature size={15} /> Viene por poder
            </label>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              {editId && <button className="btn-outline" onClick={() => { setEditId(null); setF(vacio) }}>Cancelar</button>}
              <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : editId ? 'Guardar' : <><Plus size={14} /> Acreditar</>}</button>
            </div>
          </div>
          <datalist id="asam-nombres">{nombres.map(n => <option key={n} value={n} />)}</datalist>
          {f.unidad.trim() && padron.length > 0 && (delPadron || manual) && (
            delPadron
              ? (delPadron.coeficiente != null ? <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Coeficiente según el padrón: {delPadron.coeficiente}%</div> : null)
              : <div style={{ fontSize: 12, color: '#B45309', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={12} /> La unidad {f.unidad.trim()} no está en el padrón del edificio. Revisá el número antes de acreditarla.</div>
          )}
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>Tip: Enter acredita y vuelve a "Unidad". Si alguien trae varios poderes, el nombre del apoderado queda cargado para la siguiente.</div>
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, overflow: 'hidden' }}>
        {d.unidades.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}><Users size={22} style={{ marginBottom: 6 }} /><div>Todavía no hay unidades acreditadas.</div></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="asam-tabla">
              <thead><tr><th>Unidad</th><th>Firma y vota</th>{usaCoef && <th>Coef.</th>}<th>Asistencia</th><th>Firma</th><th /></tr></thead>
              <tbody>
                {d.unidades.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 800 }}>{u.unidad}</td>
                    <td><div style={{ fontWeight: 600 }}>{votante(u)}</div>{(u.por_poder ? u.apoderado_tel : u.propietario_tel) && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u.por_poder ? u.apoderado_tel : u.propietario_tel}</div>}</td>
                    {usaCoef && <td style={{ fontVariantNumeric: 'tabular-nums' }}>{u.coeficiente != null ? `${u.coeficiente}%` : <span style={{ color: 'var(--danger)' }}>falta</span>}</td>}
                    <td>{u.por_poder ? <span className="badge badge-gold"><FileSignature size={11} /> Por poder</span> : <span className="badge badge-success">Presente</span>}</td>
                    <td>{(u.firmo || u.firma_path) ? <span className="badge badge-success"><Check size={11} /> Firmó</span> : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin firma</span>}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!cerrada && <>
                        <button className="btn-outline btn-sm" title="Editar" onClick={() => editar(u)}><Pencil size={12} /></button>
                        <button className="btn-outline btn-sm" title="Quitar" style={{ marginLeft: 6, color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => quitar(u)}><Trash2 size={12} /></button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`.acred-grid { display: grid; gap: 10px; } @media (max-width: 640px) { .acred-grid { grid-template-columns: 1fr 1fr !important; } .acred-grid > div { grid-column: 1 / -1; } }`}</style>
    </div>
  )
}

// ── Mociones ────────────────────────────────────────────────────────────────
function Mociones({ d, cerrada, onChange, etiqueta, pedirConfirm, irAAcreditar }: { d: AsambleaCompleta; cerrada: boolean; onChange: () => void; etiqueta: string; pedirConfirm: PedirConfirm; irAAcreditar: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const vacio = { titulo: '', descripcion: '', mayoria: 'simple' as Mayoria, base: 'presentes' as BaseMayoria }
  const [f, setF] = useState(vacio)
  const [abierto, setAbierto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(null)

  async function agregar() {
    if (!f.titulo.trim()) { showToast('Poné de qué se trata la moción', 'error'); return }
    setSaving(true)
    const orden = (d.mociones.reduce((m, x) => Math.max(m, x.orden), 0) || 0) + 1
    const payload = { asamblea_id: d.asamblea.id, orden, titulo: f.titulo.trim(), descripcion: f.descripcion.trim() || null, mayoria: f.mayoria, base: f.base }
    const { data, error } = await supabase.from('asamblea_mociones').insert([payload]).select().single()
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'crear', tabla: 'asamblea_mociones', registroId: data?.id, descripcion: `Moción agregada: "${payload.titulo}" — ${etiqueta}`, datosDespues: data })
    setF(vacio); setAbierto(false)
    onChange()
  }

  async function abrirVotacion(m: Mocion) {
    if (d.unidades.length === 0) { showToast('Primero acreditá las unidades presentes', 'error'); irAAcreditar(); return }
    const otra = d.mociones.find(x => x.estado === 'votando' && x.id !== m.id)
    if (otra) { showToast(`Primero cerrá la votación de "${otra.titulo}"`, 'error'); return }
    if (m.estado !== 'votando') {
      const { error } = await supabase.from('asamblea_mociones').update({ estado: 'votando', aprobada: null, resultado: null }).eq('id', m.id)
      if (error) { showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'asamblea_mociones', registroId: m.id, descripcion: `Votación abierta: "${m.titulo}" — ${etiqueta}`, datosAntes: { estado: m.estado }, datosDespues: { estado: 'votando' } })
    }
    showToast('Votación abierta: la tablet pasa sola a la pantalla de votar', 'success')
    onChange()
  }

  function cerrar(m: Mocion, sinVotar: number) {
    pedirConfirm({
      titulo: `¿Cerrar la votación de "${m.titulo}"?`,
      mensaje: sinVotar > 0 ? <><strong style={{ color: 'var(--text-main)' }}>{sinVotar} unidad{sinVotar > 1 ? 'es' : ''} todavía no votaron.</strong> Se cierra igual y se calcula el resultado con los votos que hay.</> : 'Votaron todas las unidades acreditadas. Se calcula y se guarda el resultado.',
      label: 'Cerrar votación', tono: 'neutral',
      accion: async () => { const r = await cerrarVotacion(supabase, d, m); if (r.error) showToast(r.error, 'error'); onChange() },
    })
  }

  function borrarVoto(m: Mocion, unidadId: string) {
    const u = d.unidades.find(x => x.id === unidadId)
    pedirConfirm({
      titulo: `¿Borrar el voto de la unidad ${u?.unidad}?`, mensaje: 'Va a poder volver a votar en la tablet.', label: 'Borrar voto',
      accion: async () => {
        const voto = d.votos.find(v => v.mocion_id === m.id && v.unidad_id === unidadId)
        const { error } = await supabase.from('asamblea_votos').delete().eq('mocion_id', m.id).eq('unidad_id', unidadId)
        if (error) { showToast(error.message, 'error'); return }
        await registrarAudit({ accion: 'eliminar', tabla: 'asamblea_votos', registroId: voto?.id, descripcion: `Voto borrado: unidad ${u?.unidad} en "${m.titulo}" — ${etiqueta}`, datosAntes: voto })
        onChange()
      },
    })
  }

  function eliminar(m: Mocion) {
    pedirConfirm({
      titulo: `¿Eliminar la moción "${m.titulo}"?`, mensaje: 'Se borran también sus votos.', label: 'Eliminar',
      accion: async () => {
        const { error } = await supabase.from('asamblea_mociones').delete().eq('id', m.id)
        if (error) { showToast(error.message, 'error'); return }
        await registrarAudit({ accion: 'eliminar', tabla: 'asamblea_mociones', registroId: m.id, descripcion: `Moción eliminada: "${m.titulo}" — ${etiqueta}`, datosAntes: m })
        onChange()
      },
    })
  }

  const ayudaMay = MAYORIAS.find(x => x.value === f.mayoria)?.ayuda
  const ayudaBase = BASES.find(x => x.value === f.base)?.ayuda

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!cerrada && (abierto ? (
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--gold)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>Nueva moción</strong>
            <button onClick={() => setAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
            <div className="fgroup" style={{ gridColumn: 'span 2', margin: 0 }}><label>Moción *</label><input value={f.titulo} onChange={e => setF(x => ({ ...x, titulo: e.target.value }))} placeholder="Ej: Aprobar presupuesto de pintura de fachada de Pinturas Sur" autoFocus /></div>
            <div className="fgroup" style={{ gridColumn: 'span 2', margin: 0 }}><label>Detalle</label><textarea rows={2} value={f.descripcion} onChange={e => setF(x => ({ ...x, descripcion: e.target.value }))} placeholder="Opcional: monto, condiciones, etc."
              style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--bg-card)', resize: 'vertical', boxSizing: 'border-box' }} /></div>
            <div className="fgroup" style={{ margin: 0 }}><label>Mayoría necesaria</label>
              <select value={f.mayoria} onChange={e => setF(x => ({ ...x, mayoria: e.target.value as Mayoria }))}>{MAYORIAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{ayudaMay}</div></div>
            <div className="fgroup" style={{ margin: 0 }}><label>Se calcula</label>
              <select value={f.base} onChange={e => setF(x => ({ ...x, base: e.target.value as BaseMayoria }))} disabled={f.mayoria === 'simple'}>{BASES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}</select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{f.mayoria === 'simple' ? 'La mayoría simple compara a favor contra en contra.' : ayudaBase}</div></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="btn-outline" onClick={() => setAbierto(false)}>Cancelar</button>
            <button className="btn-primary" onClick={agregar} disabled={saving}>{saving ? <Loader2 size={14} className="spin" /> : 'Agregar moción'}</button>
          </div>
        </div>
      ) : (
        <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setAbierto(true)}><Plus size={14} /> Nueva moción</button>
      ))}

      {d.mociones.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14 }}>Todavía no hay mociones. Agregá cada tema que se vota.</div>}

      {d.mociones.map((m, i) => {
        const votos = d.votos.filter(v => v.mocion_id === m.id)
        const r = calcularResultado(d.asamblea, m, d.unidades, votos)
        const votoDe = new Map(votos.map(v => [v.unidad_id, v.voto]))
        const exp = expandida === m.id
        const total = d.unidades.length
        const emitidos = votos.filter(v => d.unidades.some(u => u.id === v.unidad_id)).length
        return (
          <div key={m.id} style={{ background: 'var(--bg-card)', border: `1.5px solid ${m.estado === 'votando' ? 'var(--gold)' : 'var(--border-soft)'}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--navy)', color: 'var(--gold)', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{m.titulo}</div>
                {m.descripcion && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{m.descripcion}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>{mayoriaLabel(m.mayoria)}{m.mayoria !== 'simple' ? ` · ${baseLabel(m.base).toLowerCase()}` : ''} · hace falta {r.necesario}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {m.estado === 'cerrada' && (m.aprobada
                  ? <span className="badge badge-success" style={{ fontSize: 12.5 }}><CheckCircle2 size={13} /> Aprobada</span>
                  : <span className="badge badge-danger" style={{ fontSize: 12.5 }}><XCircle size={13} /> Rechazada</span>)}
                {m.estado === 'votando' && <span className="badge badge-gold">Votando · {emitidos}/{total}</span>}
                {m.estado === 'pendiente' && <span className="badge badge-neutral">Sin votar</span>}
              </div>
            </div>

            {/* Barra de resultados */}
            {(m.estado !== 'pendiente') && (
              <div style={{ marginTop: 12 }}>
                <BarraVotos si={r.usaUnidades ? r.unidades.si : r.coeficiente.si} no={r.usaUnidades ? r.unidades.no : r.coeficiente.no} abst={r.usaUnidades ? r.unidades.abstencion : r.coeficiente.abstencion} resto={r.usaUnidades ? r.unidades.sinVotar : r.coeficiente.sinVotar} />
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, marginTop: 6 }}>
                  {r.usaUnidades && <span><strong>Unidades:</strong> <span style={{ color: '#15803D' }}>{r.unidades.si} a favor</span> · <span style={{ color: '#B91C1C' }}>{r.unidades.no} en contra</span> · {r.unidades.abstencion} abst.{r.unidades.sinVotar ? ` · ${r.unidades.sinVotar} sin votar` : ''}</span>}
                  {r.usaCoeficiente && <span><strong>Coeficiente:</strong> <span style={{ color: '#15803D' }}>{r.coeficiente.si}%</span> · <span style={{ color: '#B91C1C' }}>{r.coeficiente.no}%</span> · {r.coeficiente.abstencion}% abst.</span>}
                  {m.estado === 'votando' && <span style={{ fontWeight: 700, color: r.aprobada ? '#15803D' : '#B91C1C' }}>Por ahora: {r.aprobada ? 'se aprueba' : 'no alcanza'}</span>}
                </div>
                {(r.faltanCoeficientes || r.faltaTotalEdificio) && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#B45309', marginTop: 6 }}>
                    <AlertTriangle size={13} /> {r.faltanCoeficientes ? 'Hay unidades sin coeficiente cargado. ' : ''}{r.faltaTotalEdificio ? 'Falta el total del edificio en "Datos": se está calculando sobre los presentes.' : ''}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {!cerrada && m.estado === 'pendiente' && <button className="btn-primary btn-sm" onClick={() => abrirVotacion(m)}><Vote size={13} /> Abrir votación</button>}
              {!cerrada && m.estado === 'votando' && <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--gold)' }}><Tablet size={13} /> Votando en la tablet...</span>
                <button className="btn-outline btn-sm" onClick={() => cerrar(m, total - emitidos)}><Lock size={13} /> Cerrar votación</button>
              </>}
              {!cerrada && m.estado === 'cerrada' && <button className="btn-outline btn-sm" onClick={() => abrirVotacion(m)}><Unlock size={13} /> Reabrir votación</button>}
              {m.estado !== 'pendiente' && <button className="btn-outline btn-sm" onClick={() => setExpandida(exp ? null : m.id)}>{exp ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Votos por unidad</button>}
              {!cerrada && <button className="btn-outline btn-sm" style={{ marginLeft: 'auto', color: 'var(--danger)', borderColor: '#FEE2E2' }} title="Eliminar moción" onClick={() => eliminar(m)}><Trash2 size={12} /></button>}
            </div>

            {exp && (
              <div style={{ marginTop: 12, border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
                <table className="asam-tabla">
                  <thead><tr><th>Unidad</th><th>Votó</th><th>Voto</th><th /></tr></thead>
                  <tbody>
                    {d.unidades.map(u => {
                      const v = votoDe.get(u.id)
                      const info = VOTOS.find(x => x.value === v)
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 800 }}>{u.unidad}{d.asamblea.modo_conteo !== 'unidad' && u.coeficiente != null ? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {u.coeficiente}%</span> : null}</td>
                          <td>{votante(u)}{u.por_poder ? <span style={{ color: 'var(--text-muted)' }}> (por poder)</span> : null}</td>
                          <td>{info ? <span style={{ fontWeight: 800, color: info.color, background: info.bg, padding: '2px 9px', borderRadius: 6, fontSize: 12.5 }}>{info.label}</span> : <span style={{ color: 'var(--text-muted)' }}>Sin votar</span>}</td>
                          <td style={{ textAlign: 'right' }}>{v && m.estado === 'votando' && !cerrada && <button className="btn-outline btn-sm" title="Borrar voto para corregir" onClick={() => borrarVoto(m, u.id)}><Trash2 size={12} /></button>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BarraVotos({ si, no, abst, resto }: { si: number; no: number; abst: number; resto: number }) {
  const tot = si + no + abst + resto || 1
  const seg = (n: number, c: string) => n > 0 ? <div style={{ width: `${(n / tot) * 100}%`, background: c }} /> : null
  return (
    <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: 'var(--border-soft)' }}>
      {seg(si, '#22C55E')}{seg(no, '#EF4444')}{seg(abst, '#94A3B8')}
    </div>
  )
}

function EditarDatos({ d, onClose, onSaved }: { d: AsambleaCompleta; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const a = d.asamblea
  const [f, setF] = useState({ tipo: a.tipo, convocatoria: a.convocatoria, modo_conteo: a.modo_conteo, total_unidades: a.total_unidades != null ? String(a.total_unidades) : '', total_coeficiente: String(a.total_coeficiente ?? 100), lugar: a.lugar || '', notas: a.notas || '' })
  const [saving, setSaving] = useState(false)
  async function guardar() {
    setSaving(true)
    const payload = { tipo: f.tipo, convocatoria: f.convocatoria, modo_conteo: f.modo_conteo, total_unidades: parseInt(f.total_unidades) || null, total_coeficiente: parseFloat(f.total_coeficiente.replace(',', '.')) || 100, lugar: f.lugar.trim() || null, notas: f.notas.trim() || null }
    const { error } = await supabase.from('asambleas').update(payload).eq('id', a.id)
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'asambleas', registroId: a.id, descripcion: `Datos de la asamblea editados — ${d.edificio}`, datosAntes: a, datosDespues: payload })
    onSaved()
  }
  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Datos de la asamblea</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
          <div className="fgroup"><label>Tipo</label><select value={f.tipo} onChange={e => setF(x => ({ ...x, tipo: e.target.value as any }))}><option>Ordinaria</option><option>Extraordinaria</option></select></div>
          <div className="fgroup"><label>Convocatoria</label><select value={f.convocatoria} onChange={e => setF(x => ({ ...x, convocatoria: e.target.value as any }))}><option>Primera</option><option>Segunda</option></select></div>
          <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Conteo de votos</label>
            <select value={f.modo_conteo} onChange={e => setF(x => ({ ...x, modo_conteo: e.target.value as ModoConteo }))}>{MODOS_CONTEO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div className="fgroup"><label>Unidades del edificio</label><input inputMode="numeric" value={f.total_unidades} onChange={e => setF(x => ({ ...x, total_unidades: e.target.value.replace(/\D/g, '') }))} /></div>
          <div className="fgroup"><label>Coeficiente total</label><input inputMode="decimal" value={f.total_coeficiente} onChange={e => setF(x => ({ ...x, total_coeficiente: e.target.value }))} /></div>
          <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Lugar</label><input value={f.lugar} onChange={e => setF(x => ({ ...x, lugar: e.target.value }))} /></div>
          <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Notas (salen en el acta)</label><textarea rows={3} value={f.notas} onChange={e => setF(x => ({ ...x, notas: e.target.value }))}
            style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--bg-card)', resize: 'vertical', boxSizing: 'border-box' }} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// Link de la tablet: entra sin usuario y solo sirve para esta asamblea.
function TabletLink({ codigo, hayVotando }: { codigo?: string | null; hayVotando: boolean }) {
  const [copiado, setCopiado] = useState(false)
  if (!codigo) return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#FEF3C7', color: '#92400E', borderRadius: 12, padding: '11px 14px', fontSize: 13, marginBottom: 14 }}>
      <AlertTriangle size={16} /> Falta correr el SQL de la tablet (schema_asambleas_v4_tablet.sql) para tener el link sin usuario.
    </div>
  )
  const url = typeof window !== 'undefined' ? `${window.location.origin}/t/${codigo}` : `/t/${codigo}`
  async function copiar() {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1600) } catch { showToast('No se pudo copiar', 'error') }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--navy)', color: 'white', borderRadius: 14, padding: '14px 18px', flexWrap: 'wrap', marginBottom: 14 }}>
      <Tablet size={26} color="#E2C47A" />
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>Tablet sin usuario {hayVotando ? '· mostrando la votación' : '· acreditación'}</div>
        <div style={{ fontSize: 12.5, color: '#B8C5D6', marginTop: 2 }}>
          Abrí este link en la tablet (no pide usuario y solo sirve para esta asamblea). Cuando abrís una votación acá, la tablet cambia sola.
        </div>
        <div style={{ fontSize: 13.5, marginTop: 6, fontFamily: 'monospace', color: '#E2C47A', wordBreak: 'break-all' }}>{url}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={copiar}>{copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Copiar link'}</button>
        <a href={url} target="_blank" rel="noreferrer" className="btn-primary btn-sm" style={{ textDecoration: 'none' }}><Tablet size={13} /> Abrir</a>
      </div>
    </div>
  )
}
