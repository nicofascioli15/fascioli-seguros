'use client'
import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import type { Obra } from '@/lib/obrasConfig'
import { soloColumnasObra } from '@/lib/obrasData'
import ObraForm, { emptyObraForm, obraToForm, formToPayload, type ObraFormState } from '@/components/obras/ObraForm'

export default function ObraModal({ obra, edificioLocked, onClose, onSaved }: {
  obra?: Obra | null                                  // si viene, es edición
  edificioLocked?: { id: string; nombre: string } | null
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState<ObraFormState>(() => obra ? obraToForm(obra) : { ...emptyObraForm, cliente_id: edificioLocked?.id || '' })
  const [edificios, setEdificios] = useState<{ id: string; nombre: string }[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('mant_clientes').select('id, nombre').order('nombre'),
      supabase.from('obras_empresas').select('nombre').order('nombre'),
    ]).then(([{ data: eds }, { data: emps }]) => {
      setEdificios(eds || [])
      setEmpresas((emps || []).map((e: any) => e.nombre))
    })
  }, [])

  async function guardar() {
    if (!form.cliente_id) { showToast('Elegí el edificio', 'error'); return }
    if (!form.titulo.trim()) { showToast('Poné un nombre para la obra', 'error'); return }
    if (form.estado === 'Finalizada' && !form.fecha_fin_real) { showToast('Para marcarla Finalizada cargá la fecha de fin real (desde ahí corren la garantía y el cierre BPS)', 'error'); return }
    setSaving(true)
    const payload = formToPayload(form)
    const edificioNombre = edificioLocked?.nombre || edificios.find(e => e.id === form.cliente_id)?.nombre || ''

    // Si escribieron una empresa nueva, se suma sola al catálogo.
    if (payload.empresa && !empresas.some(e => e.toLowerCase() === payload.empresa!.toLowerCase())) {
      await supabase.from('obras_empresas').insert([{ nombre: payload.empresa }])
    }

    if (obra) {
      const { error } = await supabase.from('obras').update(payload).eq('id', obra.id)
      setSaving(false)
      if (error) { showToast(`No se pudo guardar: ${error.message}`, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'obras', registroId: obra.id, descripcion: `Obra editada: ${payload.titulo} — ${edificioNombre}`, datosAntes: soloColumnasObra(obra), datosDespues: payload })
      showToast('Obra actualizada', 'success')
      onSaved(obra.id)
    } else {
      const { data, error } = await supabase.from('obras').insert([payload]).select().single()
      setSaving(false)
      if (error || !data) { showToast(`No se pudo crear la obra: ${error?.message || ''}`, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'obras', registroId: data.id, descripcion: `Obra nueva: ${payload.titulo} — ${edificioNombre}`, datosDespues: data })
      showToast('Obra creada', 'success')
      onSaved(data.id)
    }
  }

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>{obra ? 'Editar obra' : 'Nueva obra'}</h3>
            {!obra && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>El plan de pagos y las leyes sociales se cargan después, desde la ficha de la obra.</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <ObraForm form={form} setForm={setForm} edificios={edificios} edificioLocked={edificioLocked} empresas={empresas} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={saving}>
            {saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : obra ? 'Guardar cambios' : 'Crear obra'}
          </button>
        </div>
      </div>
    </div>
  )
}
