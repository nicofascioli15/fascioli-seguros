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

// El ensayo hidrostático vence cada 4 años, distinto del ciclo de recarga (2 años)
export const VENCIMIENTO_ENSAYO_ANIOS = 4

export const TIPOS_EXTINTOR: { key: 'cant_co2' | 'cant_8kg' | 'cant_4kg' | 'cant_espuma'; label: string }[] = [
  { key: 'cant_co2', label: 'CO2' },
  { key: 'cant_8kg', label: '8kg' },
  { key: 'cant_4kg', label: '4kg' },
  { key: 'cant_espuma', label: 'Espuma' },
]

// Lista de "extras" seleccionables al registrar una recarga de extintores.
// Agregar más ítems acá no requiere cambios de esquema (se guarda como array de texto).
export const EXTRAS_EXTINTORES = ['Mangueras revisadas']

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
