'use client'
import { useState } from 'react'
import { Landmark, Copy, Check } from 'lucide-react'
import { showToast } from '@/lib/toast'

// Banco + número de cuenta de una empresa, con botón para copiar el número (para pegarlo en el home banking).
export default function CuentaBanco({ banco, cuenta, oscuro }: { banco?: string | null; cuenta?: string | null; oscuro?: boolean }) {
  const [copiado, setCopiado] = useState(false)
  if (!banco && !cuenta) return null

  async function copiar(e: React.MouseEvent) {
    e.stopPropagation()
    if (!cuenta) return
    try {
      await navigator.clipboard.writeText(cuenta)
      setCopiado(true)
      showToast('Número de cuenta copiado', 'success')
      setTimeout(() => setCopiado(false), 1600)
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  const color = oscuro ? '#E2E8F0' : 'var(--text-main)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: oscuro ? 13 : 12.5, color }}>
      <Landmark size={13} color={oscuro ? '#E2C47A' : 'var(--gold)'} style={{ flexShrink: 0 }} />
      {banco && <strong style={{ fontWeight: 700 }}>{banco}</strong>}
      {banco && cuenta && <span style={{ opacity: .5 }}>·</span>}
      {cuenta && <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '.02em' }}>{cuenta}</span>}
      {cuenta && (
        <button type="button" onClick={copiar} title="Copiar número de cuenta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1px solid ${oscuro ? 'rgba(255,255,255,.2)' : 'var(--border)'}`, background: oscuro ? 'rgba(255,255,255,.08)' : 'var(--bg-card)', color: copiado ? '#4ADE80' : color, borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {copiado ? <Check size={11} /> : <Copy size={11} />} {copiado ? 'Copiado' : 'Copiar'}
        </button>
      )}
    </span>
  )
}
