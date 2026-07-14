'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ConfirmDialog from '@/components/ConfirmDialog'

type Item = { id: string; nombre: string }
type Tabla = 'mant_empresas'
type Scope = 'mant_extintores' | 'mant_tanques' | null

const SECCIONES: { tabla: Tabla; scope: Scope; titulo: string; abrev: string; placeholder: string }[] = [
  { tabla: 'mant_empresas', scope: 'mant_extintores', titulo: 'Empresas — Extintores', abrev: 'EXT', placeholder: 'Ej: Grolero...' },
  { tabla: 'mant_empresas', scope: 'mant_tanques', titulo: 'Empresas — Tanques de agua', abrev: 'TAN', placeholder: 'Ej: Grolero...' },
]

function Seccion({ tabla, scope, titulo, abrev, placeholder }: typeof SECCIONES[0]) {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<Item | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetch() }, [])
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetch() {
    setLoading(true)
    let q = supabase.from(tabla).select('id, nombre').order('nombre')
    if (scope) q = q.eq('tabla', scope)
    const { data } = await q
    if (data) setItems(data)
    setLoading(false)
  }

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setSaving(true)
    const { error } = await supabase.from(tabla).insert([{ nombre, ...(scope ? { tabla: scope } : {}) }])
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
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.04em' }}>{abrev}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo}</div>
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

export default function ConfiguracionMantenimientoPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Catálogos propios de Mantenimiento — independientes de la configuración de Seguros
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {SECCIONES.map(s => <Seccion key={`${s.tabla}-${s.scope}`} {...s} />)}
      </div>
    </div>
  )
}
