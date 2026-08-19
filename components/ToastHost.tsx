'use client'
import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { subscribeToast, ToastItem, ToastTone } from '@/lib/toast'

const TONE_STYLE: Record<ToastTone, { border: string; icon: any; iconColor: string }> = {
  info:    { border: 'var(--gold)', icon: Info,         iconColor: 'var(--gold)' },
  error:   { border: '#EF4444',     icon: AlertCircle,  iconColor: '#FCA5A5' },
  success: { border: '#22C55E',     icon: CheckCircle2, iconColor: '#86EFAC' },
}

// Host único para los toasts de toda la app (todos los módulos: Seguros, Contratos,
// Mantenimiento). Se monta una sola vez en app/layout.tsx. Reemplaza al alert() nativo
// del navegador, que no se puede estilizar y desentona con el resto de la interfaz.
export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => subscribeToast(setItems), [])

  if (items.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', maxWidth: '90vw' }}>
      {items.map(t => {
        const s = TONE_STYLE[t.tone] || TONE_STYLE.info
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, width: 360, maxWidth: '100%',
            background: 'var(--navy)', color: 'white', padding: '13px 16px', borderRadius: 10,
            fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, boxShadow: '0 8px 24px rgba(0,0,0,.25)',
            borderLeft: `3px solid ${s.border}`,
          }}>
            <s.icon size={17} color={s.iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, wordBreak: 'break-word' }}>{t.text}</div>
          </div>
        )
      })}
    </div>
  )
}
