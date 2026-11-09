'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Search, X, Vote, Building2, CalendarDays, ChevronRight, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import DatePicker from '@/components/DatePicker'
import { hoyLocal } from '@/lib/obrasConfig'
import { traerTodo } from '@/lib/traerTodo'
import { MODOS_CONTEO, formatFechaAsamblea, type Asamblea, type ModoConteo } from '@/lib/asambleas'

type Edificio = { id: string; nombre: string; direccion?: string | null; codigo?: string | null; unidades?: number }
type Fila = Asamblea & { edificio: string; n_unidades: number; n_mociones: number }

export default function AsambleasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [filas, setFilas] = useState<Fila[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [nueva, setNueva] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase.from('asambleas')
      .select('*, mant_clientes(nombre), asamblea_unidades(count), asamblea_mociones(count)')
      .order('fecha', { ascending: false }).order('created_at', { ascending: false })
    if (error) { showToast(`No se pudieron cargar las asambleas: ${error.message}`, 'error'); setLoading(false); return }
    setFilas((data || []).map((a: any) => ({
      ...a, edificio: a.mant_clientes?.nombre || 'Sin edificio',
      n_unidades: a.asamblea_unidades?.[0]?.count ?? 0, n_mociones: a.asamblea_mociones?.[0]?.count ?? 0,
    })))
    setLoading(false)
  }

  const q = search.trim().toLowerCase()
  const visibles = filas.filter(f => !q || f.edificio.toLowerCase().includes(q) || (f.lugar || '').toLowerCase().includes(q))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Asambleas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Acreditación de unidades, mociones y votación electrónica con tablet</p>
        </div>
        <button className="btn-primary" onClick={() => setNueva(true)}><Plus size={15} /> Nueva asamblea</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input placeholder="Buscar edificio..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}><Loader2 size={22} className="spin" /></div>
        : visibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', fontSize: 13 }}>
            {filas.length === 0 ? 'Todavía no hay asambleas. Creá una con "Nueva asamblea" antes de ir al edificio.' : 'Sin resultados'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {visibles.map(f => (
              <div key={f.id} onClick={() => router.push(`/asambleas/${f.id}`)} className="asam-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--navy)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Vote size={18} color="var(--gold)" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15.5 }}>{f.edificio}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}><CalendarDays size={12} /> {formatFechaAsamblea(f.fecha)} · {f.tipo}</div>
                  </div>
                  <span className={`badge ${f.estado === 'abierta' ? 'badge-gold' : 'badge-success'}`}>{f.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--bg-card-alt)', borderRadius: 8, padding: '8px 10px', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={12} /> <strong style={{ color: 'var(--text-main)' }}>{f.n_unidades}</strong> unidades{f.total_unidades ? ` de ${f.total_unidades}` : ''}</span>
                  <span><strong style={{ color: 'var(--text-main)' }}>{f.n_mociones}</strong> mociones</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', color: 'var(--gold)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

      {nueva && <NuevaAsamblea onClose={() => setNueva(false)} onCreada={id => router.push(`/asambleas/${id}`)} />}

      <style>{`
        .asam-card { background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; cursor: pointer; transition: transform .15s, border-color .15s, box-shadow .15s; }
        .asam-card:hover { transform: translateY(-2px); border-color: var(--gold); box-shadow: 0 12px 26px -14px rgba(15,30,53,.3); }
      `}</style>
    </div>
  )
}

// Igual que en el resto del sistema: paso 1 elegir edificio, paso 2 datos.
function NuevaAsamblea({ onClose, onCreada }: { onClose: () => void; onCreada: (id: string) => void }) {
  const supabase = createClient()
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [elegido, setElegido] = useState<Edificio | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fecha: hoyLocal(), tipo: 'Ordinaria', convocatoria: 'Primera', modo_conteo: 'unidad' as ModoConteo, total_unidades: '', total_coeficiente: '100', lugar: '' })

  useEffect(() => {
    // Se muestra el código y cuántas unidades tiene cada edificio, para elegir el que tiene el padrón cargado.
    Promise.all([
      traerTodo<any>(() => supabase.from('mant_clientes').select('id, nombre, direccion, codigo').order('nombre').order('id')),
      traerTodo<any>(() => supabase.from('edificio_unidades').select('cliente_id').order('id')).catch(() => []),
    ]).then(([eds, us]) => {
      const n: Record<string, number> = {}
      us.forEach((u: any) => { n[u.cliente_id] = (n[u.cliente_id] || 0) + 1 })
      setEdificios(eds.map((e: any) => ({ ...e, unidades: n[e.id] || 0 })))
    })
  }, [])

  // Si el edificio tiene el padrón cargado, se completa solo la cantidad de unidades.
  async function elegir(e: Edificio) {
    setElegido(e)
    const { data } = await supabase.from('edificio_unidades').select('coeficiente').eq('cliente_id', e.id)
    if (data && data.length) {
      const suma = Math.round(data.reduce((s: number, u: any) => s + Number(u.coeficiente || 0), 0) * 100) / 100
      setForm(f => ({ ...f, total_unidades: String(data.length), ...(suma > 0 ? { total_coeficiente: String(suma) } : {}) }))
    }
  }

  async function crear() {
    if (!elegido) return
    setSaving(true)
    const payload = {
      cliente_id: elegido.id, fecha: form.fecha || hoyLocal(), tipo: form.tipo, convocatoria: form.convocatoria, modo_conteo: form.modo_conteo,
      total_unidades: parseInt(form.total_unidades) || null,
      total_coeficiente: form.modo_conteo === 'unidad' ? 100 : (parseFloat(form.total_coeficiente.replace(',', '.')) || 100),
      lugar: form.lugar.trim() || null,
    }
    const { data, error } = await supabase.from('asambleas').insert([payload]).select().single()
    setSaving(false)
    if (error || !data) { showToast(`No se pudo crear: ${error?.message || ''}`, 'error'); return }
    await registrarAudit({ accion: 'crear', tabla: 'asambleas', registroId: data.id, descripcion: `Asamblea ${payload.tipo.toLowerCase()} creada — ${elegido.nombre} (${formatFechaAsamblea(payload.fecha)})`, datosDespues: data })
    onCreada(data.id)
  }

  const qq = busqueda.toLowerCase()
  const filtrados = edificios.filter(e => e.nombre.toLowerCase().includes(qq) || (e.direccion || '').toLowerCase().includes(qq) || (e.codigo || '').toLowerCase().includes(qq))
  const set = (c: Partial<typeof form>) => setForm(f => ({ ...f, ...c }))

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>{elegido ? 'Nueva asamblea' : 'Seleccionar edificio'}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Paso {elegido ? 2 : 1} de 2</div>
            {elegido && <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', marginTop: 6 }}>{elegido.nombre}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {!elegido ? (
          <>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input placeholder="Buscar edificio..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus
                style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtrados.map(e => (
                <div key={e.id} onClick={() => elegir(e)} className="asam-ed">
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'grid', placeItems: 'center', fontWeight: 800, color: 'var(--gold)', flexShrink: 0 }}>{e.nombre.trim()[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{e.nombre}</div>{e.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.direccion}</div>}</div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {e.codigo && <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gold)' }}>{e.codigo}</div>}
                    <div style={{ fontSize: 11.5, color: e.unidades ? '#15803D' : 'var(--text-muted)', fontWeight: e.unidades ? 700 : 400 }}>{e.unidades ? `${e.unidades} unidades` : 'sin unidades'}</div>
                  </div>
                </div>
              ))}
              {filtrados.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin edificios</div>}
            </div>
            <style>{`.asam-ed { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 9px; border: 1.5px solid var(--border-soft); cursor: pointer; background: var(--bg-card); } .asam-ed:hover { border-color: var(--gold); background: var(--gold-pale); }`}</style>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
              <div className="fgroup"><label>Fecha</label><DatePicker value={form.fecha} onChange={v => set({ fecha: v })} /></div>
              <div className="fgroup"><label>Tipo</label>
                <select value={form.tipo} onChange={e => set({ tipo: e.target.value })}><option>Ordinaria</option><option>Extraordinaria</option></select></div>
              <div className="fgroup"><label>Convocatoria</label>
                <select value={form.convocatoria} onChange={e => set({ convocatoria: e.target.value })}><option>Primera</option><option>Segunda</option></select></div>
              <div className="fgroup"><label>Lugar</label><input value={form.lugar} onChange={e => set({ lugar: e.target.value })} placeholder="Ej: Hall del edificio" /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>¿Cómo se cuentan los votos?</label>
                <select value={form.modo_conteo} onChange={e => set({ modo_conteo: e.target.value as ModoConteo })}>
                  {MODOS_CONTEO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{MODOS_CONTEO.find(m => m.value === form.modo_conteo)?.ayuda} Se toma de lo que diga el reglamento de copropiedad.</div>
              </div>
              <div className="fgroup"><label>Unidades del edificio</label><input inputMode="numeric" value={form.total_unidades} onChange={e => set({ total_unidades: e.target.value.replace(/\D/g, '') })} placeholder="Ej: 24" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Para el quórum y las mayorías sobre el total.</div></div>
              {form.modo_conteo !== 'unidad' && (
                <div className="fgroup"><label>Coeficiente total</label><input inputMode="decimal" value={form.total_coeficiente} onChange={e => set({ total_coeficiente: e.target.value })} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Normalmente 100 (%).</div></div>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card-alt)', borderRadius: 8, padding: '8px 11px', marginTop: 12, lineHeight: 1.45 }}>
              Las unidades se acreditan el día de la asamblea, a medida que llegan (y las que vienen por poder). Solo votan las acreditadas.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setElegido(null)} disabled={saving}>← Cambiar edificio</button>
              <button className="btn-primary" onClick={crear} disabled={saving}>{saving ? <><Loader2 size={14} className="spin" /> Creando...</> : 'Crear asamblea'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
