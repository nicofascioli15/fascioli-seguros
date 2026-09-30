'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import CuentasEditor from '@/components/obras/CuentasEditor'
import { cuentasDe, payloadCuentas, type CuentaEmpresa } from '@/lib/cuentasEmpresa'

export type EmpresaObra = {
  id: string; nombre: string; rut: string | null; contacto: string | null; tel: string | null; email: string | null
  banco?: string | null; nro_cuenta?: string | null; titular_cuenta?: string | null; cuentas?: any
}

// Alta / edición de una empresa de obras (lo usan la lista de Empresas y la ficha de la empresa).
export default function EmpresaModal({ empresa, onClose, onSaved }: { empresa: EmpresaObra | null; onClose: () => void; onSaved: (e: { id?: string; nombre: string }) => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    nombre: empresa?.nombre || '', rut: empresa?.rut || '', contacto: empresa?.contacto || '', tel: empresa?.tel || '', email: empresa?.email || '',
    cuentas: (empresa ? cuentasDe(empresa) : []) as CuentaEmpresa[],
  })
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!form.nombre.trim()) { showToast('Poné el nombre de la empresa', 'error'); return }
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), rut: form.rut.trim() || null, contacto: form.contacto.trim() || null, tel: form.tel.trim() || null, email: form.email.trim() || null, ...payloadCuentas(form.cuentas) }
    if (!empresa) {
      const { data, error } = await supabase.from('obras_empresas').insert([payload]).select().single()
      if (error) { setSaving(false); showToast(error.message.includes('unique') || error.message.includes('duplicate') ? 'Ya existe una empresa con ese nombre' : error.message, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'obras_empresas', registroId: data?.id, descripcion: `Empresa de obras agregada: ${payload.nombre}`, datosDespues: data })
      setSaving(false)
      onSaved({ id: data?.id, nombre: payload.nombre })
      return
    }
    const { error } = await supabase.from('obras_empresas').update(payload).eq('id', empresa.id)
    if (error) { setSaving(false); showToast(error.message, 'error'); return }
    // Si cambió el nombre, se actualiza también en las obras que la usan.
    if (empresa.nombre !== payload.nombre) await supabase.from('obras').update({ empresa: payload.nombre }).ilike('empresa', empresa.nombre.replace(/[%_\\]/g, m => '\\' + m))
    await registrarAudit({ accion: 'editar', tabla: 'obras_empresas', registroId: empresa.id, descripcion: `Empresa de obras editada: ${payload.nombre}`, datosAntes: empresa, datosDespues: payload })
    setSaving(false)
    showToast('Empresa guardada', 'success')
    onSaved({ id: empresa.id, nombre: payload.nombre })
  }

  return (
    <div className="pago-overlay open" onClick={ev => { if (ev.target === ev.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={ev => ev.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>{empresa ? 'Editar empresa' : 'Nueva empresa'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
          <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nombre *</label><input value={form.nombre} onChange={ev => setForm(f => ({ ...f, nombre: ev.target.value }))} /></div>
          <div className="fgroup"><label>RUT</label><input value={form.rut} onChange={ev => setForm(f => ({ ...f, rut: ev.target.value }))} /></div>
          <div className="fgroup"><label>Contacto</label><input value={form.contacto} onChange={ev => setForm(f => ({ ...f, contacto: ev.target.value }))} /></div>
          <div className="fgroup"><label>Teléfono</label><input value={form.tel} onChange={ev => setForm(f => ({ ...f, tel: ev.target.value }))} /></div>
          <div className="fgroup"><label>Email</label><input value={form.email} onChange={ev => setForm(f => ({ ...f, email: ev.target.value }))} /></div>
          <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Cuentas bancarias</label>
            <CuentasEditor cuentas={form.cuentas} onChange={c => setForm(f => ({ ...f, cuentas: c }))} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
