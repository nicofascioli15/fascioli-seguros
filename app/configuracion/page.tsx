'use client'
import { useState, useEffect } from 'react'
import { Plus, X, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; nombre: string; activa?: boolean; activo?: boolean }
type Tabla = 'companias' | 'ramos' | 'corredores' | 'metodos_pago'

const SECCIONES: { tabla: Tabla; titulo: string; icono: string; placeholder: string }[] = [
  { tabla: 'companias',    titulo: 'Compañías aseguradoras', icono: '🏢', placeholder: 'Ej: BSE, SURA, Mapfre...' },
  { tabla: 'ramos',        titulo: 'Ramos / Tipos de seguro', icono: '🏷️', placeholder: 'Ej: Incendio, RC...' },
  { tabla: 'corredores',   titulo: 'Corredores',              icono: '👤', placeholder: 'Ej: Fascioli, Otro...' },
  { tabla: 'metodos_pago', titulo: 'Métodos de pago',         icono: '💳', placeholder: 'Ej: Transferencia...' },
]

function Seccion({ tabla, titulo, icono, placeholder }: typeof SECCIONES[0]) {
  const supabase = createClient()
  const [items, setItems]   = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo]   = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from(tabla).select('id, nombre, activa, activo').order('nombre')
    if (data) setItems(data)
    setLoading(false)
  }

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setSaving(true)
    const { error } = await supabase.from(tabla).insert([{ nombre }])
    if (error) {
      showToast(`❌ ${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    } else {
      setNuevo('')
      showToast(`✓ "${nombre}" agregado`)
      await fetch()
    }
    setSaving(false)
  }

  async function eliminar(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"? Esto puede afectar pólizas existentes.`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) {
      showToast(`❌ No se pudo eliminar — puede estar en uso`)
    } else {
      showToast(`🗑 "${item.nombre}" eliminado`)
      await fetch()
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icono}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>
            {loading ? '...' : `${items.length} registros`}
          </div>
        </div>
      </div>

      {/* Add new */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--navy)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nuevo.trim()}
          style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>

      {/* List */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--slate)' }}>
            <Loader2 size={18} style={{ display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }} />
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>
            Sin registros. Agregá el primero arriba.
          </div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--navy)' }}>{item.nombre}</span>
            <button
              onClick={() => eliminar(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Toast local */}
      {toast && (
        <div style={{ padding: '10px 16px', background: toast.startsWith('❌') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('❌') ? '#991B1B' : '#1A7A4E' }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Administrá los catálogos del sistema</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {SECCIONES.map(s => <Seccion key={s.tabla} {...s} />)}
      </div>
    </div>
  )
}

