'use client'
import { useState } from 'react'
import { Landmark, Copy, Check } from 'lucide-react'
import { showToast } from '@/lib/toast'

// Banco + número de cuenta de una empresa. "Copiar" copia banco, cuenta y titular (uno por línea) para pegarlo en el home banking o en un mensaje.
export default function CuentaBanco({ banco, cuenta, titular, empresa, oscuro }: { banco?: string | null; cuenta?: string | null; titular?: string | null; empresa?: string | null; oscuro?: boolean }) {
  const [copiado, setCopiado] = useState(false)
  if (!banco && !cuenta) return null

  async function copiar(e: React.MouseEvent) {
    e.stopPropagation()
    if (!cuenta) return
    try {
      const texto = [
        banco && `Banco: ${banco}`,
        `Cuenta: ${cuenta}`,
        (titular || empresa) && `Titular: ${titular || empresa}`,
      ].filter(Boolean).join('\n')
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      showToast('Datos de la cuenta copiados', 'success')
      setTimeout(() => setCopiado(false), 1600)
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  const color = oscuro ? '#E2E8F0' : 'var(--text-main)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: oscuro ? 13 : 12.5, color }}>
      <Landmark size={13} color={oscuro ? '#E2C47A' : 'var(--gold)'} style={{ flexShrink: 0 }} />
      {banco && <strong style={{ fontWeight: 700 }}>{banco}</strong>}
      {banco && cuenta && <span style={{ opacity: .5 }}>·</span>}
      {cuenta && <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '.02em' }}>{cuenta}</span>}
      {titular && <span style={{ opacity: .75 }}>· a nombre de {titular}</span>}
      {cuenta && (
        <button type="button" onClick={copiar} title="Copiar banco, cuenta y titular"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1px solid ${oscuro ? 'rgba(255,255,255,.2)' : 'var(--border)'}`, background: oscuro ? 'rgba(255,255,255,.08)' : 'var(--bg-card)', color: copiado ? '#4ADE80' : color, borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {copiado ? <Check size={11} /> : <Copy size={11} />} {copiado ? 'Copiado' : 'Copiar'}
        </button>
      )}
    </span>
  )
}
