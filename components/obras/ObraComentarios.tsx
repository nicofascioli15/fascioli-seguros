'use client'
import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, MessageSquareText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import DatePicker from '@/components/DatePicker'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatFecha, hoyLocal } from '@/lib/obrasConfig'

type Comentario = { id: string; obra_id: string; fecha: string; texto: string }

export default function ObraComentarios({ obraId, etiqueta }: { obraId: string; etiqueta: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<Comentario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [texto, setTexto] = useState('')
  const [fecha, setFecha] = useState(hoyLocal())
  const [confirmEliminar, setConfirmEliminar] = useState<Comentario | null>(null)

  useEffect(() => { cargar() }, [obraId])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('obras_comentarios').select('id, obra_id, fecha, texto, created_at').eq('obra_id', obraId).order('fecha', { ascending: false }).order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function agregar() {
    if (!texto.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('obras_comentarios').insert([{ obra_id: obraId, fecha: fecha || hoyLocal(), texto: texto.trim() }]).select().single()
    if (error) { setSaving(false); showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'crear', tabla: 'obras_comentarios', registroId: data?.id, descripcion: `Comentario — ${etiqueta}: ${texto.trim().slice(0, 80)}`, datosDespues: data })
    setTexto('')
    setFecha(hoyLocal())
    setSaving(false)
    cargar()
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setSaving(true)
    const { error } = await supabase.from('obras_comentarios').delete().eq('id', confirmEliminar.id)
    if (error) { setSaving(false); showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'obras_comentarios', registroId: confirmEliminar.id, descripcion: `Comentario eliminado — ${etiqueta}`, datosAntes: confirmEliminar })
    setSaving(false)
    setConfirmEliminar(null)
    cargar()
  }

  return (
    <div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
          <div className="fgroup" style={{ margin: 0, width: 180 }}><label style={{ fontSize: 11 }}>Fecha</label><DatePicker value={fecha} onChange={setFecha} /></div>
        </div>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} placeholder="Novedad de la obra: reunión con la empresa, atraso, reclamo de un copropietario, acuerdo de pago..."
          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--bg-card)', resize: 'vertical', marginBottom: 8, boxSizing: 'border-box' }} />
        <button className="btn-primary btn-sm" onClick={agregar} disabled={saving || !texto.trim()}>
          {saving ? <Loader2 size={13} className="spin" /> : <Plus size={13} />} Agregar comentario
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><Loader2 size={20} className="spin" /></div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin comentarios todavía</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 18 }}>
          <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: 'var(--border-soft)' }} />
          {items.map(c => (
            <div key={c.id} style={{ position: 'relative', marginBottom: 10 }}>
              <div style={{ position: 'absolute', left: -16, top: 12, width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)' }} />
              <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 9 }}>
                <MessageSquareText size={15} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{formatFecha(c.fecha)}</div>
                  <div style={{ fontSize: 13, marginTop: 2, whiteSpace: 'pre-wrap' }}>{c.texto}</div>
                </div>
                <button onClick={() => setConfirmEliminar(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, alignSelf: 'flex-start' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar este comentario?"
        message={<>Se va a eliminar el comentario del <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar ? formatFecha(confirmEliminar.fecha) : ''}</strong>.</>}
        loading={saving}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}
