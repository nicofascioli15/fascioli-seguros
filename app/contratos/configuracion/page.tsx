'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ConfirmDialog from '@/components/ConfirmDialog'
import { fetchCategorias, slugify, CategoriaRow, TipoCategoria } from '@/lib/contratosConfig'

type Item = { id: string; nombre: string }

function CatalogoSeccion({ categoria, tabla, titulo, placeholder }: { categoria: CategoriaRow; tabla: 'contratos_empresas' | 'contratos_tipos'; titulo: string; placeholder: string }) {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<Item | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetch() }, [categoria.slug])
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from(tabla).select('id, nombre').eq('categoria', categoria.slug).order('nombre')
    if (data) setItems(data)
    setLoading(false)
  }

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setSaving(true)
    const { error } = await supabase.from(tabla).insert([{ nombre, categoria: categoria.slug }])
    if (error) showToast(`❌ ${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    else { setNuevo(''); showToast(`✓ "${nombre}" agregado`); await fetch() }
    setSaving(false)
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    const { error } = await supabase.from(tabla).delete().eq('id', confirmEliminar.id)
    setEliminando(false)
    if (error) showToast('❌ No se pudo eliminar — puede estar en uso')
    else { showToast(`"${confirmEliminar.nombre}" eliminado`); await fetch() }
    setConfirmEliminar(null)
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.04em' }}>{categoria.slug.slice(0, 3).toUpperCase()}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo} — {categoria.label}</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>{loading ? '...' : `${items.length} registros`}</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--text-main)', transition: 'border-color .14s' }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nuevo.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={18} style={{ display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin registros — agregá el primero arriba</div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-main)' }}>{item.nombre}</span>
            <button onClick={() => setConfirmEliminar(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {toast && (
        <div style={{ padding: '10px 16px', background: toast.startsWith('❌') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('❌') ? '#991B1B' : '#1A7A4E' }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <ConfirmDialog
        open={!!confirmEliminar}
        title={`¿Eliminar "${confirmEliminar?.nombre}"?`}
        message="Esta acción no se puede deshacer."
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}

function CategoriasSeccion({ categorias, onChange }: { categorias: CategoriaRow[]; onChange: () => void }) {
  const supabase = createClient()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo]     = useState<TipoCategoria>('auto')
  const [empresaInicial, setEmpresaInicial] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<string | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<CategoriaRow | null>(null)
  const [eliminando, setEliminando] = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function agregar() {
    const label = nombre.trim()
    if (!label) return
    setSaving(true)
    let slug = slugify(label)
    // Evitar choques de slug si ya existe uno igual
    let intento = 1
    while (categorias.some(c => c.slug === slug)) { slug = `${slugify(label)}-${++intento}` }
    const orden = (categorias.reduce((max, c) => Math.max(max, c.orden), 0) || 0) + 1
    const { error } = await supabase.from('contratos_categorias').insert([{ slug, label, tipo, orden }])
    const empresa = empresaInicial.trim()
    if (!error && empresa) {
      await supabase.from('contratos_empresas').insert([{ nombre: empresa, categoria: slug }])
    }
    setSaving(false)
    if (error) showToast(`❌ ${error.message}`)
    else {
      setNombre(''); setEmpresaInicial('')
      showToast(`✓ "${label}" agregada${empresa ? ` con empresa "${empresa}"` : ''} — ya aparece en el menú`)
      onChange()
    }
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    const { count } = await supabase.from('contratos').select('*', { count: 'exact', head: true }).eq('categoria', confirmEliminar.slug)
    if (count && count > 0) {
      setEliminando(false)
      showToast(`❌ Hay ${count} contrato${count > 1 ? 's' : ''} cargado${count > 1 ? 's' : ''} en "${confirmEliminar.label}" — no se puede eliminar`)
      setConfirmEliminar(null)
      return
    }
    await supabase.from('contratos_categorias').delete().eq('id', confirmEliminar.id)
    await supabase.from('contratos_empresas').delete().eq('categoria', confirmEliminar.slug)
    await supabase.from('contratos_tipos').delete().eq('categoria', confirmEliminar.slug)
    setEliminando(false)
    showToast(`"${confirmEliminar.label}" eliminada`)
    setConfirmEliminar(null)
    onChange()
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Tag size={15} color="var(--gold)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Categorías de contrato</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>{categorias.length} categorías · aparecen solas en el menú</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder="Ej: Limpieza de tanques, Seguridad..."
          style={{ flex: 1, minWidth: 160, padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--text-main)' }} />
        <select value={tipo} onChange={e => setTipo(e.target.value as TipoCategoria)}
          style={{ padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--navy)' }}>
          <option value="auto">Se renueva sola (vigencia en años)</option>
          <option value="garantia">Fecha fin fija + garantía</option>
        </select>
        <input value={empresaInicial} onChange={e => setEmpresaInicial(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder="Empresa inicial (opcional)"
          style={{ flex: 1, minWidth: 160, padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--text-main)' }} />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nombre.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>
      <div>
        {categorias.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin categorías todavía</div>
        ) : categorias.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-main)', fontWeight: 600 }}>{c.label}</span>
            <span className={`badge ${c.tipo === 'auto' ? 'badge-blue' : 'badge-neutral'}`}>{c.tipo === 'auto' ? 'Auto-renovable' : 'Con garantía'}</span>
            <button onClick={() => setConfirmEliminar(c)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {toast && (
        <div style={{ padding: '10px 16px', background: toast.startsWith('❌') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('❌') ? '#991B1B' : '#1A7A4E' }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <ConfirmDialog
        open={!!confirmEliminar}
        title={`¿Eliminar "${confirmEliminar?.label}"?`}
        message="Esta acción no se puede deshacer. Si tiene contratos cargados, no se va a poder eliminar."
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}

export default function ConfiguracionContratosPage() {
  const supabase = createClient()
  const [categorias, setCategorias] = useState<CategoriaRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])
  async function cargar() {
    setLoading(true)
    setCategorias(await fetchCategorias(supabase))
    setLoading(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Categorías de contrato y catálogos de empresas / tipos de contrato por categoría
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <CategoriasSeccion categorias={categorias} onChange={cargar} />
      </div>

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {categorias.map(c => (
            <CatalogoSeccion key={`emp-${c.id}`} categoria={c} tabla="contratos_empresas" titulo="Empresas" placeholder="Ej: Otis, TKE, Delta..." />
          ))}
          {categorias.map(c => (
            <CatalogoSeccion key={`tipo-${c.id}`} categoria={c} tabla="contratos_tipos" titulo="Tipos de contrato" placeholder="Ej: Básico, Integral, Premium..." />
          ))}
        </div>
      )}
    </div>
  )
}
