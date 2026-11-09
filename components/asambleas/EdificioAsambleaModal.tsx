'use client'
import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'

type Ed = { id: string; nombre: string; direccion: string | null; codigo: string | null }

// Alta / edición de un edificio de Asambleas (propio del módulo, no es el de Seguros/Mantenimiento/Obras).
export default function EdificioAsambleaModal({ edificio, onClose, onSaved, onDeleted }: { edificio: Ed | null; onClose: () => void; onSaved: (id?: string) => void; onDeleted?: () => void }) {
  const supabase = createClient()
  const [f, setF] = useState({ codigo: edificio?.codigo || '', nombre: edificio?.nombre || '', direccion: edificio?.direccion || '' })
  const [saving, setSaving] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  async function guardar() {
    if (!f.nombre.trim()) { showToast('Poné el nombre del edificio', 'error'); return }
    setSaving(true)
    const payload = { codigo: f.codigo.trim().toUpperCase() || null, nombre: f.nombre.trim(), direccion: f.direccion.trim() || null }
    const { data, error } = edificio
      ? await supabase.from('asam_edificios').update(payload).eq('id', edificio.id).select().single()
      : await supabase.from('asam_edificios').insert([payload]).select().single()
    setSaving(false)
    if (error) { showToast(error.message.includes('duplicate') ? `Ya hay un edificio con el código ${payload.codigo}` : error.message, 'error'); return }
    await registrarAudit({ accion: edificio ? 'editar' : 'crear', tabla: 'asam_edificios', registroId: data?.id, descripcion: `Edificio de asambleas ${edificio ? 'editado' : 'creado'}: ${payload.nombre}`, datosAntes: edificio, datosDespues: payload })
    onSaved(data?.id)
  }

  async function eliminar() {
    if (!edificio) return
    setSaving(true)
    const { error } = await supabase.from('asam_edificios').delete().eq('id', edificio.id)
    setSaving(false)
    if (error) { showToast(error.message.includes('foreign') || error.message.includes('violates') ? 'No se puede borrar: tiene asambleas hechas. Borrá primero esas asambleas.' : error.message, 'error'); setConfirmar(false); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'asam_edificios', registroId: edificio.id, descripcion: `Edificio de asambleas eliminado: ${edificio.nombre}`, datosAntes: edificio })
    onDeleted?.()
  }

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{edificio ? 'Editar edificio' : 'Nuevo edificio'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px 12px' }}>
          <div className="fgroup"><label>Código</label><input value={f.codigo} onChange={e => setF(x => ({ ...x, codigo: e.target.value }))} placeholder="Ej: A01" /></div>
          <div className="fgroup"><label>Nombre *</label><input value={f.nombre} onChange={e => setF(x => ({ ...x, nombre: e.target.value }))} /></div>
          <div className="fgroup" style={{ gridColumn: '1 / -1' }}><label>Dirección</label><input value={f.direccion} onChange={e => setF(x => ({ ...x, direccion: e.target.value }))} /></div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>El código es el del sistema de gastos comunes: con él se enganchan los aptos al importar.</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          {edificio ? <button className="btn-outline" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmar(true)}><Trash2 size={13} /> Eliminar</button> : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
        <ConfirmDialog open={confirmar} title={`¿Eliminar "${edificio?.nombre}"?`} message="Se borran también sus torres y aptos del padrón de Asambleas. No afecta a Seguros, Mantenimiento, Obras ni Contratos." loading={saving} onConfirm={eliminar} onCancel={() => setConfirmar(false)} />
      </div>
    </div>
  )
}
