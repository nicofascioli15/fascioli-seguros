'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; nombre: string }
type Tabla = 'companias' | 'ramos' | 'corredores' | 'metodos_pago' | 'tipos_siniestro' | 'tipos_documento' | 'monedas'

const SECCIONES: { tabla: Tabla; titulo: string; abrev: string; placeholder: string }[] = [
  { tabla: 'companias',       titulo: 'Compañías aseguradoras',   abrev: 'CIA', placeholder: 'Ej: BSE, SURA, Mapfre...' },
  { tabla: 'ramos',           titulo: 'Ramos / Tipos de seguro',  abrev: 'RAM', placeholder: 'Ej: Incendio, RC...' },
  { tabla: 'corredores',      titulo: 'Corredores',               abrev: 'COR', placeholder: 'Ej: Fascioli...' },
  { tabla: 'metodos_pago',    titulo: 'Métodos de pago',          abrev: 'PAG', placeholder: 'Ej: Transferencia...' },
  { tabla: 'tipos_siniestro', titulo: 'Tipos de siniestro',       abrev: 'SIN', placeholder: 'Ej: Choque, Robo...' },
  { tabla: 'tipos_documento', titulo: 'Tipos de documento',       abrev: 'DOC', placeholder: 'Ej: Póliza, Endoso...' },
  { tabla: 'monedas',         titulo: 'Monedas',                  abrev: 'MON', placeholder: 'Ej: U$S, $, €...' },
]

function Seccion({ tabla, titulo, abrev, placeholder }: typeof SECCIONES[0]) {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from(tabla).select('id, nombre').order('nombre')
    if (data) setItems(data)
    setLoading(false)
  }

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setSaving(true)
    const { error } = await supabase.from(tabla).insert([{ nombre }])
    if (error) {
      showToast(`${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    } else {
      setNuevo('')
      showToast(`"${nombre}" agregado`)
      await fetch()
    }
    setSaving(false)
  }

  async function eliminar(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) {
      showToast(`No se pudo eliminar — puede estar en uso`)
    } else {
      showToast(`"${item.nombre}" eliminado`)
      await fetch()
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.04em' }}>{abrev}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>
            {loading ? '...' : `${items.length} registros`}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--navy)', transition: 'border-color .14s' }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nuevo.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>

      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--slate)' }}>
            <Loader2 size={18} style={{ display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }} />
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>
            Sin registros — agregá el primero arriba
          </div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--navy)' }}>{item.nombre}</span>
            <button
              onClick={() => eliminar(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ padding: '10px 16px', background: toast.startsWith('') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('') ? '#991B1B' : '#1A7A4E' }}>
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
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Administrá todos los catálogos del sistema</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {SECCIONES.map(s => <Seccion key={s.tabla} {...s} />)}
      </div>
    </div>
  )
}

