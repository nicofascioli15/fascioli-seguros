'use client'
export const dynamic = 'force-dynamic'
import { HistorialCompu, HistorialTactil } from '@/components/asambleas/Historial'
import { useVistaTactil } from '@/hooks/useVistaTactil'

export default function HistorialAsambleasPage() {
  const tactil = useVistaTactil()
  if (tactil === undefined) return null
  return tactil ? <HistorialTactil /> : <HistorialCompu />
}
