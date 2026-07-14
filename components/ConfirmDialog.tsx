'use client'
import { AlertTriangle, Trash2 } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', loading, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !loading) onCancel() }}>
      <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <AlertTriangle size={26} color="var(--danger)" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>{title}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
            onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando...' : <><Trash2 size={14} /> {confirmLabel}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
