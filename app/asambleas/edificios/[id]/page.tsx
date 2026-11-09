'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Search, Plus, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import EdificioAsambleaModal from '@/components/asambleas/EdificioAsambleaModal'
import { useRouter } from 'next/navigation'
import { etiquetaUnidad } from '@/lib/padronImport'

type Unidad = {
  id: string; edificio_id: string; torre: string; unidad: string
  propietario: string | null; propietario_tel: string | null; propietario_email: string | null; coeficiente: number | null
}
type Torre = { id: string; codigo: string; nombre: string | null }

export default function EdificioPadronPage() {
  const { id } = useParams() as { id: string }
  const supabase = createClient()
  const [ed, setEd] = useState<{ nombre: string; direccion: string | null; codigo: string | null } | null | undefined>(undefined)
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [torres, setTorres] = useState<Torre[]>([])
  const [search, setSearch] = useState('')
  const [editando, setEditando] = useState<Unidad | 'nueva' | null>(null)
  const [borrar, setBorrar] = useState<Unidad | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [editEd, setEditEd] = useState(false)
  const router = useRouter()

  useEffect(() => { cargar() }, [id])
  async function cargar() {
    const [{ data: e }, { data: us }, { data: ts }] = await Promise.all([
      supabase.from('asam_edificios').select('nombre, direccion, codigo').eq('id', id).maybeSingle(),
      supabase.from('asam_unidades').select('*').eq('edificio_id', id),
      supabase.from('asam_torres').select('*').eq('edificio_id', id).order('codigo'),
    ])
    setEd(e || null)
    setUnidades(((us || []) as Unidad[]).map(u => ({ ...u, coeficiente: u.coeficiente != null ? Number(u.coeficiente) : null }))
      .sort((a, b) => a.torre.localeCompare(b.torre) || a.unidad.localeCompare(b.unidad, 'es', { numeric: true })))
    setTorres(ts || [])
  }

  async function eliminar() {
    if (!borrar) return
    setBorrando(true)
    const { error } = await supabase.from('asam_unidades').delete().eq('id', borrar.id)
    setBorrando(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'asam_unidades', registroId: borrar.id, descripcion: `Unidad ${etiquetaUnidad(borrar)} eliminada del padrón — ${ed?.nombre}`, datosAntes: borrar })
    setBorrar(null); cargar()
  }

  if (ed === undefined) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={24} className="spin" /></div>
  if (ed === null) return <div style={{ textAlign: 'center', padding: 60 }}><div style={{ fontWeight: 700, marginBottom: 12 }}>No se encontró el edificio</div><Link href="/asambleas/edificios" className="btn-outline">Volver</Link></div>

  const q = search.trim().toLowerCase()
  const visibles = unidades.filter(u => !q || etiquetaUnidad(u).toLowerCase().includes(q))
  const nombreTorre = (c: string) => torres.find(t => t.codigo === c)?.nombre || c
  const sumaCoef = Math.round(unidades.reduce((s, u) => s + (u.coeficiente || 0), 0) * 100) / 100
  const conCoef = unidades.filter(u => u.coeficiente != null).length

  return (
    <div>
      <Link href="/asambleas/edificios" className="btn-outline btn-sm" style={{ marginBottom: 14, display: 'inline-flex' }}><ArrowLeft size={13} /> Edificios</Link>
      <div style={{ background: 'var(--navy)', color: 'white', borderRadius: 16, padding: '20px 22px', marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, background: 'rgba(226,196,122,.15)', display: 'grid', placeItems: 'center', color: '#E2C47A', fontWeight: 800 }}>{ed.codigo || '—'}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{ed.nombre}</div>
          <div style={{ fontSize: 13, color: '#B8C5D6', marginTop: 4 }}>{ed.direccion || 'Sin dirección'} · {unidades.length} unidades{conCoef ? ` · coeficientes ${conCoef}/${unidades.length} (suman ${sumaCoef}%)` : ''}</div>
        </div>
        <button className="btn-outline btn-sm" style={{ background: 'rgba(226,196,122,.15)', color: '#E2C47A', borderColor: 'rgba(226,196,122,.4)' }} onClick={() => setEditando('nueva')}><Plus size={13} /> Agregar unidad</button>
        <button className="btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: 'white', borderColor: 'rgba(255,255,255,.2)' }} onClick={() => setEditEd(true)}><Pencil size={13} /> Editar edificio</button>
      </div>

      {torres.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {torres.map(t => <span key={t.id} className="badge badge-neutral">{t.codigo} · {t.nombre}</span>)}
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 12, maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input placeholder="Buscar unidad..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, overflow: 'hidden' }}>
        {visibles.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{unidades.length ? 'Sin resultados' : 'Este edificio no tiene unidades cargadas. Importalas desde "Edificios y unidades" o agregalas a mano.'}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pad-tabla">
              <thead><tr>{torres.length > 0 && <th>Torre</th>}<th>Unidad</th><th>Coef.</th><th /></tr></thead>
              <tbody>
                {visibles.map(u => (
                  <tr key={u.id}>
                    {torres.length > 0 && <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.torre ? nombreTorre(u.torre) : '—'}</td>}
                    <td style={{ fontWeight: 800 }}>{u.unidad}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{u.coeficiente != null ? `${u.coeficiente}%` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-outline btn-sm" title="Editar" onClick={() => setEditando(u)}><Pencil size={12} /></button>
                      <button className="btn-outline btn-sm" title="Eliminar" style={{ marginLeft: 6, color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setBorrar(u)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editEd && <EdificioAsambleaModal edificio={{ id, ...ed }} onClose={() => setEditEd(false)} onSaved={() => { setEditEd(false); cargar() }} onDeleted={() => router.push('/asambleas/edificios')} />}
      {editando && <EditarUnidad clienteId={id} edificio={ed.nombre} unidad={editando === 'nueva' ? null : editando} torres={torres} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); cargar() }} />}
      <ConfirmDialog open={!!borrar} title={`¿Eliminar la unidad ${borrar ? etiquetaUnidad(borrar) : ''}?`} message="Se saca del padrón del edificio. Las asambleas ya hechas no cambian." loading={borrando} onConfirm={eliminar} onCancel={() => setBorrar(null)} />
      <style>{`
        .pad-tabla { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .pad-tabla th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding: 9px 12px; background: var(--bg-card-alt); white-space: nowrap; }
        .pad-tabla td { padding: 9px 12px; border-top: 1px solid var(--border-soft); vertical-align: middle; }
      `}</style>
    </div>
  )
}

function EditarUnidad({ clienteId, edificio, unidad, torres, onClose, onSaved }: { clienteId: string; edificio: string; unidad: Unidad | null; torres: Torre[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [f, setF] = useState({
    torre: unidad?.torre || '', unidad: unidad?.unidad || '',
    coeficiente: unidad?.coeficiente != null ? String(unidad.coeficiente) : '',
  })
  const [saving, setSaving] = useState(false)
  const set = (c: Partial<typeof f>) => setF(x => ({ ...x, ...c }))

  async function guardar() {
    if (!f.unidad.trim()) { showToast('Poné el número de unidad', 'error'); return }
    const coef = f.coeficiente.trim() ? parseFloat(f.coeficiente.replace(',', '.')) : null
    if (coef != null && (isNaN(coef) || coef < 0)) { showToast('El coeficiente no es válido', 'error'); return }
    setSaving(true)
    const n = (s: string) => s.trim() || null
    const payload = { edificio_id: clienteId, torre: f.torre.trim().toUpperCase(), unidad: f.unidad.trim(), coeficiente: coef }
    const { data, error } = unidad
      ? await supabase.from('asam_unidades').update(payload).eq('id', unidad.id).select().single()
      : await supabase.from('asam_unidades').insert([payload]).select().single()
    setSaving(false)
    if (error) { showToast(error.message.includes('duplicate') ? 'Esa unidad ya existe en el edificio' : error.message, 'error'); return }
    await registrarAudit({ accion: unidad ? 'editar' : 'crear', tabla: 'asam_unidades', registroId: data?.id, descripcion: `Unidad ${etiquetaUnidad(payload)} ${unidad ? 'editada' : 'agregada'} en el padrón — ${edificio}`, datosAntes: unidad, datosDespues: payload })
    onSaved()
  }

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{unidad ? `Unidad ${etiquetaUnidad(unidad)}` : 'Agregar unidad'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 12px' }}>
          {torres.length > 0 && <div className="fgroup"><label>Torre</label><select value={f.torre} onChange={e => set({ torre: e.target.value })}><option value="">—</option>{torres.map(t => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.nombre}</option>)}</select></div>}
          <div className="fgroup"><label>Unidad *</label><input value={f.unidad} onChange={e => set({ unidad: e.target.value })} /></div>
          <div className="fgroup"><label>Coeficiente %</label><input inputMode="decimal" value={f.coeficiente} onChange={e => set({ coeficiente: e.target.value })} placeholder="Ej: 4,25" /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
