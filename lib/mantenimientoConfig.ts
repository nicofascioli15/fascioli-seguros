export type MantTabla = 'mant_extintores' | 'mant_tanques'

export const VENCIMIENTO_ANIOS: Record<MantTabla, number> = {
  mant_extintores: 2,
  mant_tanques: 1,
}

export const ACCION: Record<MantTabla, string> = {
  mant_extintores: 'recarga',
  mant_tanques: 'limpieza',
}

export const ACCION_TITULO: Record<MantTabla, string> = {
  mant_extintores: 'Nueva recarga de extintores',
  mant_tanques: 'Nueva limpieza de tanques de agua',
}

export const ESTADOS_GESTION = ['No realizado', 'En proceso', 'Completado'] as const
export type EstadoGestion = typeof ESTADOS_GESTION[number]

export function estadoBadgeClass(estado: string): string {
  if (estado === 'Completado') return 'badge-success'
  if (estado === 'En proceso') return 'badge-warning'
  if (estado === 'No realizado') return 'badge-danger'
  return 'badge-neutral'
}

// Suma años a una fecha 'YYYY-MM-DD' y devuelve el mismo formato
export function sumarAnios(fecha: string, anios: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y + anios, (m || 1) - 1, d || 1)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
