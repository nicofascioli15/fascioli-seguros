'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Search, Building2, ChevronRight, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import { traerTodo } from '@/lib/traerTodo'
import ImportarPadron from '@/components/asambleas/ImportarPadron'

type Fila = { id: string; nombre: string; direccion: string | null; codigo: string | null; unidades: number; conDatos: number }

export default function EdificiosPadronPage() {
  const supabase = createClient()
  const router = useRouter()
  const [filas, setFilas] = useState<Fila[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [importando, setImportando] = useState(false)
  const [soloConUnidades, setSoloConUnidades] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const [eds, us] = await Promise.all([
        traerTodo<any>(() => supabase.from('mant_clientes').select('id, nombre, direccion, codigo').order('id')),
        traerTodo<any>(() => supabase.from('edificio_unidades').select('cliente_id, propietario').order('id')),
      ])
      const c: Record<string, { n: number; d: number }> = {}
      us.forEach(u => { c[u.cliente_id] ||= { n: 0, d: 0 }; c[u.cliente_id].n++; if (u.propietario) c[u.cliente_id].d++ })
      setFilas(eds.map(e => ({ ...e, unidades: c[e.id]?.n || 0, conDatos: c[e.id]?.d || 0 }))
        .sort((a, b) => (a.codigo || 'ZZZ').localeCompare(b.codigo || 'ZZZ', 'es', { numeric: true }) || a.nombre.localeCompare(b.nombre)))
    } catch (e: any) {
      showToast(`No se pudo cargar el padrón: ${e?.message || e}. ¿Está corrido el SQL de edificios y unidades?`, 'error')
    }
    setLoading(false)
  }

  const q = search.trim().toLowerCase()
  const visibles = filas.filter(f => (!soloConUnidades || f.unidades > 0) && (!q || f.nombre.toLowerCase().includes(q) || (f.direccion || '').toLowerCase().includes(q) || (f.codigo || '').toLowerCase().includes(q)))
  const totalU = filas.reduce((s, f) => s + f.unidades, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Edificios y unidades</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{filas.length} edificios · {totalU} unidades cargadas · se usan para acreditar en las asambleas</p>
        </div>
        <button className="btn-primary" onClick={() => setImportando(true)}><Upload size={15} /> Importar archivos</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Buscar por nombre, dirección o código..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
        </div>
        <button className={`filter-btn ${soloConUnidades ? 'active' : ''}`} onClick={() => setSoloConUnidades(v => !v)}>Solo con unidades</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}><Loader2 size={22} className="spin" /></div>
        : visibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', fontSize: 13 }}>Sin resultados</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {visibles.map(f => (
              <div key={f.id} className="pad-card" onClick={() => router.push(`/asambleas/edificios/${f.id}`)}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--navy)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--gold)', fontWeight: 800, fontSize: 12.5 }}>{f.codigo || <Building2 size={17} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>{f.nombre}</div>
                  {f.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.direccion}</div>}
                  <div style={{ fontSize: 12, marginTop: 3, color: f.unidades ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={12} /> {f.unidades ? <><strong>{f.unidades}</strong> unidades · {f.conDatos} con propietario</> : 'Sin unidades cargadas'}
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        )}

      {importando && <ImportarPadron onClose={() => setImportando(false)} onDone={cargar} />}
      <style>{`.pad-card { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: border-color .15s, transform .15s; } .pad-card:hover { border-color: var(--gold); transform: translateY(-1px); }`}</style>
    </div>
  )
}
