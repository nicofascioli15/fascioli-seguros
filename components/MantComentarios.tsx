'use client'
import { useState, useEffect } from 'react'
import { X, Loader2, Plus, Trash2, MessageSquareText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import DatePicker from '@/components/DatePicker'
import ConfirmDialog from '@/components/ConfirmDialog'

type Comentario = { id: string; fecha: string; texto: string }

type Props = {
  tabla: 'mant_extintores' | 'mant_tanques' | 'mant_bomberos'
  registroId: string
  clienteNombre: string
  onClose: () => void
}

function fkColDe(tabla: Props['tabla']) {
  if (tabla === 'mant_extintores') return 'extintor_id'
  if (tabla === 'mant_tanques') return 'tanque_id'
  return 'bombero_id'
}

function formatFecha(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MantComentarios({ tabla, registroId, clienteNombre, onClose }: Props) {
  const supabase = createClient()
  const fkCol = fkColDe(tabla)

  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [texto, setTexto]       = useState('')
  const [fecha, setFecha]       = useState(hoyStr())
  const [confirmEliminar, setConfirmEliminar] = useState<Comentario | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetchComentarios() }, [registroId])

  async function fetchComentarios() {
    setLoading(true)
    const { data } = await supabase.from('mant_comentarios').select('id, fecha, texto').eq(fkCol, registroId).order('fecha', { ascending: false })
    setComentarios(data || [])
    setLoading(false)
  }

  async function agregar() {
    if (!texto.trim()) return
    setSaving(true)
    const { data } = await supabase.from('mant_comentarios').insert([{ [fkCol]: registroId, fecha: fecha || hoyStr(), texto: texto.trim() }]).select().single()
    await registrarAudit({
      accion: 'crear', tabla: 'mant_comentarios', registroId: data?.id,
      descripcion: `Comentario agregado — ${clienteNombre}: ${texto.trim().slice(0, 80)}`,
      datosDespues: data,
    })
    setTexto('')
    setFecha(hoyStr())
    setSaving(false)
    await fetchComentarios()
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await supabase.from('mant_comentarios').delete().eq('id', confirmEliminar.id)
    await registrarAudit({
      accion: 'eliminar', tabla: 'mant_comentarios', registroId: confirmEliminar.id,
      descripcion: `Comentario eliminado — ${clienteNombre}: ${confirmEliminar.texto.slice(0, 80)}`,
      datosAntes: confirmEliminar,
    })
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchComentarios()
  }

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pago-modal" style={{ width: 460, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Comentarios</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>{clienteNombre}</div>

        <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div className="fgroup" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Fecha</label>
              <DatePicker value={fecha} onChange={setFecha} />
            </div>
          </div>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} placeholder="Novedad, seguimiento, nota interna..."
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--navy)', outline: 'none', background: 'var(--bg-card)', resize: 'vertical', marginBottom: 8, boxSizing: 'border-box' }} />
          <button className="btn-primary btn-sm" onClick={agregar} disabled={saving || !texto.trim()}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />} Agregar comentario
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : comentarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin comentarios registrados</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comentarios.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', border: '1px solid var(--border-soft)', borderRadius: 9 }}>
                <MessageSquareText size={15} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{formatFecha(c.fecha)}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{c.texto}</div>
                </div>
                <button onClick={() => setConfirmEliminar(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, alignSelf: 'flex-start' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar este comentario?"
        message={<>Se va a eliminar el comentario del <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar ? formatFecha(confirmEliminar.fecha) : ''}</strong>. Esta acción no se puede deshacer.</>}
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}
