'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, Search, X, Building2, HardHat, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fetchObrasCompletas } from '@/lib/obrasData'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { eliminarEdificioCompleto } from '@/lib/edificios'
import ConfirmDialog from '@/components/ConfirmDialog'
import ObraModal from '@/components/obras/ObraModal'

type Edificio = { id: string; nombre: string; direccion: string | null; contacto: string | null; tel: string | null; email: string | null }
const vacio = { nombre: '', direccion: '', contacto: '', tel: '', email: '' }

// Los edificios son los MISMOS de Mantenimiento y Contratos (tabla mant_clientes):
// lo que se crea, edita o borra acá se ve en todos los módulos.
export default function ObrasEdificiosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [conteo, setConteo] = useState<Record<string, { total: number; activas: number }>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [soloConObras, setSoloConObras] = useState(false)
  const [editando, setEditando] = useState<Edificio | 'nuevo' | null>(null)
  const [form, setForm] = useState(vacio)
  const [saving, setSaving] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<Edificio | null>(null)
  const [nuevaObraPara, setNuevaObraPara] = useState<Edificio | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: eds }, { data: obras }] = await Promise.all([
      supabase.from('mant_clientes').select('id, nombre, direccion, contacto, tel, email').order('nombre'),
      fetchObrasCompletas(supabase).then(data => ({ data })),
    ])
    const c: Record<string, { total: number; activas: number }> = {}
    ;(obras || []).forEach((o: any) => {
      c[o.cliente_id] ||= { total: 0, activas: 0 }
      c[o.cliente_id].total++
      if (!o.cerrada) c[o.cliente_id].activas++
    })
    setConteo(c)
    setEdificios(eds || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim()) { showToast('Poné el nombre del edificio', 'error'); return }
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), direccion: form.direccion.trim() || null, contacto: form.contacto.trim() || null, tel: form.tel.trim() || null, email: form.email.trim() || null }
    if (editando === 'nuevo') {
      const { data, error } = await supabase.from('mant_clientes').insert([payload]).select().single()
      if (error) { setSaving(false); showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'mant_clientes', registroId: data?.id, descripcion: `Edificio agregado (desde Obras): ${payload.nombre}`, datosDespues: data })
    } else if (editando) {
      const { error } = await supabase.from('mant_clientes').update(payload).eq('id', editando.id)
      if (error) { setSaving(false); showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'mant_clientes', registroId: editando.id, descripcion: `Edificio editado (desde Obras): ${payload.nombre}`, datosAntes: editando, datosDespues: payload })
    }
    setSaving(false)
    setEditando(null)
    cargar()
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setSaving(true)
    const { error } = await eliminarEdificioCompleto(supabase, confirmEliminar.id)
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'mant_clientes', registroId: confirmEliminar.id, descripcion: `Edificio eliminado (desde Obras): ${confirmEliminar.nombre}`, datosAntes: confirmEliminar })
    setConfirmEliminar(null)
    showToast('Edificio eliminado de todos los módulos', 'success')
    cargar()
  }

  const q = search.toLowerCase()
  const visibles = edificios
    .filter(e => !q || e.nombre.toLowerCase().includes(q) || (e.direccion || '').toLowerCase().includes(q))
    .filter(e => !soloConObras || (conteo[e.id]?.total || 0) > 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Edificios</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Misma cartera que Mantenimiento y Contratos · {edificios.length} edificios</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(vacio); setEditando('nuevo') }}><Plus size={15} /> Nuevo edificio</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar edificio o dirección..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
        </div>
        <button className={`filter-btn ${soloConObras ? 'active' : ''}`} onClick={() => setSoloConObras(s => !s)}>Solo con obras</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}><Loader2 size={22} className="spin" /></div> : (
        <div className="table-card">
          <table>
            <thead><tr><th>Edificio</th><th>Dirección</th><th>Obras</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {visibles.map(e => {
                const c = conteo[e.id] || { total: 0, activas: 0 }
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Building2 size={14} color="var(--gold)" /> {e.nombre}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.direccion || '—'}</td>
                    <td>
                      {c.total > 0 ? (
                        <button onClick={() => router.push(`/obras/lista?edificio=${e.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', fontSize: 13, padding: 0 }}>
                          <HardHat size={13} color="var(--gold)" /> <strong>{c.activas}</strong> abiertas · {c.total} total <ChevronRight size={13} />
                        </button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Sin obras</span>}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-outline btn-sm" onClick={() => setNuevaObraPara(e)}><Plus size={12} /> Obra</button>{' '}
                      <button className="btn-outline btn-sm" onClick={() => { setForm({ nombre: e.nombre, direccion: e.direccion || '', contacto: e.contacto || '', tel: e.tel || '', email: e.email || '' }); setEditando(e) }}><Pencil size={12} /></button>{' '}
                      <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(e)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="mobile-list" style={{ display: 'none' }}>
            {visibles.map(e => {
              const c = conteo[e.id] || { total: 0, activas: 0 }
              return (
                <div key={e.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5FB', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => c.total && router.push(`/obras/lista?edificio=${e.id}`)}>
                    <div style={{ fontWeight: 700 }}>{e.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.total ? `${c.activas} abiertas · ${c.total} obras` : 'Sin obras'}</div>
                  </div>
                  <button className="btn-outline btn-sm" onClick={() => setNuevaObraPara(e)}><Plus size={12} /></button>
                  <button className="btn-outline btn-sm" onClick={() => { setForm({ nombre: e.nombre, direccion: e.direccion || '', contacto: e.contacto || '', tel: e.tel || '', email: e.email || '' }); setEditando(e) }}><Pencil size={12} /></button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {editando && (
        <div className="pago-overlay open" onClick={ev => { if (ev.target === ev.currentTarget && !saving) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={ev => ev.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>{editando === 'nuevo' ? 'Nuevo edificio' : 'Editar edificio'}</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Se refleja también en Mantenimiento y Contratos.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nombre *</label><input value={form.nombre} onChange={ev => setForm(f => ({ ...f, nombre: ev.target.value }))} /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Dirección</label><input value={form.direccion} onChange={ev => setForm(f => ({ ...f, direccion: ev.target.value }))} /></div>
              <div className="fgroup"><label>Contacto</label><input value={form.contacto} onChange={ev => setForm(f => ({ ...f, contacto: ev.target.value }))} /></div>
              <div className="fgroup"><label>Teléfono</label><input value={form.tel} onChange={ev => setForm(f => ({ ...f, tel: ev.target.value }))} /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Email</label><input value={form.email} onChange={ev => setForm(f => ({ ...f, email: ev.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title={`¿Eliminar "${confirmEliminar?.nombre}"?`}
        message={<>Ojo: el edificio se borra de <strong style={{ color: 'var(--text-main)' }}>todos los módulos</strong> (Mantenimiento, Contratos y Obras), con sus registros y documentos. No se puede deshacer.</>}
        loading={saving}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />

      {nuevaObraPara && (
        <ObraModal edificioLocked={{ id: nuevaObraPara.id, nombre: nuevaObraPara.nombre }} onClose={() => setNuevaObraPara(null)} onSaved={id => { setNuevaObraPara(null); router.push(`/obras/${id}`) }} />
      )}
    </div>
  )
}
