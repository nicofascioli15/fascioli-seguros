'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, AlertTriangle, X, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'

const ESTADOS   = ['En gestión', 'Documentación', 'Pericial', 'Cerrado']
// TIPOS_SIN stays hardcoded - siniestro types are not in catalogs

const estadoColor: Record<string, string> = {
  'En gestión':    'badge-blue',
  'Documentación': 'badge-warning',
  'Pericial':      'badge-neutral',
  'Cerrado':       'badge-success',
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Cliente  = { id: string; nombre: string; direccion: string }
type Poliza   = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null }
type Siniestro = {
  id: string
  tipo: string
  descripcion: string
  fecha_ocurrencia: string | null
  estado: string
  created_at: string
  polizas: { numero: string; ramo: string; compania: string } | null
  clientes: { nombre: string } | null
}

type Paso = 'cliente' | 'poliza' | 'datos'

export default function SiniestrosPage() {
  const supabase = createClient()

  const [tiposSin, setTiposSin]       = useState<string[]>([])
  const [tiposDoc, setTiposDoc]       = useState<string[]>([])
  const [siniestros, setSiniestros]   = useState<Siniestro[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [polizasCliente, setPolizasCliente] = useState<Poliza[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtro, setFiltro]           = useState('Todos')

  // Modal
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSel, setClienteSel]   = useState<Cliente | null>(null)
  const [polizaSel, setPolizaSel]     = useState<Poliza | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({
    tipo: 'Choque', descripcion: '', fecha_ocurrencia: new Date().toISOString().slice(0,10), estado: 'En gestión'
  })

  useEffect(() => {
    fetchSiniestros()
    fetchClientes()
    Promise.all([
      supabase.from('tipos_siniestro').select('nombre').order('nombre'),
      supabase.from('tipos_documento').select('nombre').order('nombre'),
    ]).then(([ts, td]) => {
      setTiposSin((ts.data || []).map((x: any) => x.nombre))
      setTiposDoc((td.data || []).map((x: any) => x.nombre))
    })
  }, [])

  async function fetchSiniestros() {
    setLoading(true)
    const { data } = await supabase
      .from('siniestros')
      .select('*, polizas(numero, ramo, compania), clientes(nombre)')
      .order('created_at', { ascending: false })
    if (data) setSiniestros(data)
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchPolizasCliente(clienteId: string) {
    const { data } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento')
      .eq('cliente_id', clienteId)
      .order('ramo')
    setPolizasCliente(data || [])
  }

  async function guardarSiniestro() {
    if (!clienteSel) return
    setSaving(true)
    const { error } = await supabase.from('siniestros').insert([{
      cliente_id:       clienteSel.id,
      poliza_id:        polizaSel?.id || null,
      tipo:             form.tipo,
      descripcion:      form.descripcion,
      fecha_ocurrencia: form.fecha_ocurrencia || null,
      estado:           form.estado,
    }])
    if (!error) {
      cerrarModal()
      await fetchSiniestros()
    }
    setSaving(false)
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('siniestros').update({ estado }).eq('id', id)
    await fetchSiniestros()
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSel(null); setPolizaSel(null)
    setPolizasCliente([])
    setForm({ tipo: 'Choque', descripcion: '', fecha_ocurrencia: new Date().toISOString().slice(0,10), estado: 'En gestión' })
    setShowModal(true)
  }

  function cerrarModal() { setShowModal(false); setClienteSel(null); setPolizaSel(null); setPaso('cliente') }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  const filtrados = siniestros.filter(s => {
    const q = search.toLowerCase()
    return (!q || (s.clientes?.nombre || '').toLowerCase().includes(q) || (s.polizas?.numero || '').toLowerCase().includes(q) || s.tipo.toLowerCase().includes(q)) &&
           (filtro === 'Todos' || s.estado === filtro)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Siniestros</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
            {loading ? 'Cargando...' : `${siniestros.filter(s => s.estado !== 'Cerrado').length} abiertos · ${siniestros.filter(s => s.estado === 'Cerrado').length} cerrados`}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirModal}><Plus size={15} /> Nuevo siniestro</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente, póliza o tipo..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos', ...ESTADOS].map(t =>
            <button key={t} onClick={() => setFiltro(t)} className={`filter-btn ${filtro === t ? 'active' : ''}`}>{t}</button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando siniestros...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay siniestros registrados</div>
          <div style={{ fontSize: 12 }}>Usá el botón "Nuevo siniestro" para registrar uno</div>
        </div>
      ) : filtrados.map(s => (
        <div key={s.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, background: '#FEE2E2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#D94F4F" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{s.clientes?.nombre || '—'}</span>
                <span className={`badge ${estadoColor[s.estado] || 'badge-neutral'}`}>{s.estado}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{s.tipo}</div>
              {s.polizas && (
                <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 4 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{s.polizas.ramo}</span>
                  <span style={{ fontFamily: 'monospace' }}>{s.polizas.numero}</span>
                  {' · '}{s.polizas.compania}
                </div>
              )}
              {s.descripcion && <div style={{ fontSize: 13, color: 'var(--navy)', marginTop: 4 }}>{s.descripcion}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Fecha</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{formatFecha(s.fecha_ocurrencia)}</div>
              {/* Cambiar estado */}
              <select
                value={s.estado}
                onChange={e => cambiarEstado(s.id, e.target.value)}
                style={{ marginTop: 8, padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'white', color: 'var(--navy)' }}
              >
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}

      {/* ── MODAL NUEVO SINIESTRO (3 pasos) ─────────────────────────── */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: paso === 'datos' ? 540 : 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? '👥 Seleccionar cliente' : paso === 'poliza' ? '📄 Seleccionar póliza' : '🛡️ Datos del siniestro'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : paso === 'poliza' ? '2' : '3'} de 3
                  {clienteSel && paso !== 'cliente' && ` — ${clienteSel.nombre}`}
                  {polizaSel && paso === 'datos' && ` · ${polizaSel.ramo} ${polizaSel.numero}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {/* Barra de progreso */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza','datos'].map((p, i) => (
                <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .2s',
                  background: (paso === 'poliza' && i <= 1) || (paso === 'datos' && i <= 2) || (paso === 'cliente' && i === 0) ? 'var(--gold)' : 'var(--border)'
                }} />
              ))}
            </div>

            {/* Paso 1: cliente */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--navy)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSel(c); fetchPolizasCliente(c.id); setPaso('poliza') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{c.direccion}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No se encontraron clientes</div>}
                </div>
              </>
            )}

            {/* Paso 2: póliza */}
            {paso === 'poliza' && (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {polizasCliente.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>
                      Este cliente no tiene pólizas cargadas
                    </div>
                  ) : polizasCliente.map(p => (
                    <div key={p.id} onClick={() => { setPolizaSel(p); setPaso('datos') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-neutral">{p.ramo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{p.numero}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                          {p.compania}{p.vencimiento ? ` · Vence ${formatFecha(p.vencimiento)}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                  <button className="btn-outline" onClick={() => { setPolizaSel(null); setPaso('datos') }}>Sin póliza específica →</button>
                </div>
              </>
            )}

            {/* Paso 3: datos */}
            {paso === 'datos' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <div className="fgroup">
                    <label>Tipo de siniestro *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      {tiposSin.map((t: string) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <label>Fecha de ocurrencia</label>
                    <DatePicker value={form.fecha_ocurrencia} onChange={v => setForm({ ...form, fecha_ocurrencia: v })} />
                  </div>
                  <div className="fgroup">
                    <label>Estado inicial</label>
                    <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                      {ESTADOS.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Descripción</label>
                    <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      placeholder="Describí brevemente el siniestro..."
                      rows={3}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('poliza')}>← Cambiar póliza</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={guardarSiniestro} disabled={saving}>
                      {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar siniestro'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

