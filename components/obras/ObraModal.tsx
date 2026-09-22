'use client'
import { useEffect, useState } from 'react'
import { X, Loader2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import type { Obra } from '@/lib/obrasConfig'
import { soloColumnasObra } from '@/lib/obrasData'
import ObraForm, { emptyObraForm, obraToForm, formToPayload, type ObraFormState } from '@/components/obras/ObraForm'

type Edificio = { id: string; nombre: string; direccion?: string | null }

// Mismo flujo que el resto del sistema (Mantenimiento, Bomberos, Contratos):
// paso 1 = elegir el edificio con buscador y tarjetas; paso 2 = datos, con el edificio fijo arriba.
export default function ObraModal({ obra, edificioLocked, onClose, onSaved }: {
  obra?: Obra | null                                  // si viene, es edición
  edificioLocked?: { id: string; nombre: string } | null
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState<ObraFormState>(() => obra ? obraToForm(obra) : { ...emptyObraForm, cliente_id: edificioLocked?.id || '' })
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [paso, setPaso] = useState<'edificio' | 'datos'>(obra || edificioLocked ? 'datos' : 'edificio')
  const [elegido, setElegido] = useState<Edificio | null>(edificioLocked || null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('mant_clientes').select('id, nombre, direccion').order('nombre'),
      supabase.from('obras_empresas').select('nombre').order('nombre'),
    ]).then(([{ data: eds }, { data: emps }]) => {
      setEdificios(eds || [])
      setEmpresas((emps || []).map((e: any) => e.nombre))
    })
  }, [])

  function elegir(e: Edificio) {
    setElegido(e)
    setForm(p => ({ ...p, cliente_id: e.id }))
    setPaso('datos')
  }

  async function guardar() {
    if (!form.cliente_id) { showToast('Elegí el edificio', 'error'); return }
    if (!form.titulo.trim()) { showToast('Poné un nombre para la obra', 'error'); return }
    setSaving(true)
    const payload = formToPayload(form)
    const edificioNombre = elegido?.nombre || edificios.find(e => e.id === form.cliente_id)?.nombre || ''

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

  const q = busqueda.toLowerCase()
  const filtrados = edificios.filter(c => c.nombre.toLowerCase().includes(q) || (c.direccion || '').toLowerCase().includes(q))

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>{obra ? 'Editar obra' : paso === 'edificio' ? 'Seleccionar edificio' : 'Nueva obra'}</h3>
            {!obra && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Paso {paso === 'edificio' ? '1' : '2'} de 2</div>}
            {!obra && paso === 'datos' && elegido && (
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', marginTop: 6, lineHeight: 1.2 }}>{elegido.nombre}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {!obra && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {['edificio', 'datos'].map((p, i) => (
              <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= ['edificio', 'datos'].indexOf(paso) ? 'var(--gold)' : 'var(--border)', transition: 'background .2s' }} />
            ))}
          </div>
        )}

        {paso === 'edificio' ? (
          <>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input placeholder="Buscar edificio..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus
                style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtrados.map(c => (
                <div key={c.id} onClick={() => elegir(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border-soft)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-soft)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                    {c.nombre.trim()[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{c.nombre}</div>
                    {c.direccion && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.direccion}</div>}
                  </div>
                </div>
              ))}
              {filtrados.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin edificios</div>}
            </div>
          </>
        ) : (
          <>
            {!obra && <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card-alt)', borderRadius: 8, padding: '8px 11px', marginBottom: 14, lineHeight: 1.45 }}>Acá van solo los datos del contrato. Pagos, leyes sociales, documentos, fin de obra y cierre BPS se completan después, desde la ficha de la obra.</div>}
            <ObraForm modo={obra ? 'editar' : 'nueva'} form={form} setForm={setForm} edificios={edificios} edificioLocked={obra ? null : elegido} empresas={empresas} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {!obra ? <button className="btn-outline" onClick={() => setPaso('edificio')} disabled={saving}>← Cambiar edificio</button> : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
                <button className="btn-primary" onClick={guardar} disabled={saving}>
                  {saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : obra ? 'Guardar cambios' : 'Crear obra'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
