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

export const DOCS_TIPOS: Record<MantTabla, string[]> = {
  mant_extintores: ['Presupuesto', 'Factura o recibo', 'Otro'],
  mant_tanques: ['Presupuesto', 'Factura o recibo', 'Análisis de potabilidad', 'Otro'],
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

// Lista de "extras" con cantidad al registrar una recarga de extintores.
// Agregar más ítems acá no requiere cambios de esquema (se guarda como jsonb).
export const EXTRAS_EXTINTORES: { key: string; label: string }[] = [
  { key: 'mangueras', label: 'Mangueras' },
  { key: 'valvulas', label: 'Válvulas' },
  { key: 'carteles', label: 'Carteles' },
  { key: 'colocacion', label: 'Colocación' },
]

// ===== Bomberos (habilitación / Decreto 372/023 y anteriores) =====
// Es una entidad distinta a extintores/tanques (fechas y campos propios de un trámite),
// por eso tiene sus propias constantes en vez de sumarse a MantTabla.

export const TIPOS_TRAMITE_BOMBEROS: { value: string; label: string; descripcion: string }[] = [
  { value: 'PTC',   label: 'PTC — Proyecto Técnico-Certificación',
    descripcion: 'Para viviendas colectivas de hasta 1 nivel sobre planta baja, o locales chicos (hasta 750 m² y 12 m de altura). Es el trámite más simple.' },
  { value: 'PT',    label: 'PT — Proyecto Técnico',
    descripcion: 'Para viviendas colectivas de más de 1 nivel sobre planta baja, o locales más grandes que los del PTC. El más común en edificios de varios pisos.' },
  { value: 'PG',    label: 'PG — Plan Gradual',
    descripcion: 'Para edificios existentes desde antes del Decreto 184/018 que se regularizan de forma progresiva, en 3 etapas (C1, C2, C3).' },
  { value: 'POT',   label: 'POT — Ocupación Temporal',
    descripcion: 'Para uso u ocupación temporal de un espacio (eventos, ferias). No aplica a la operación normal de un edificio de vivienda.' },
  { value: 'POTEP', label: 'POTEP — Ocupación Temporal en Edif. Permanentes',
    descripcion: 'Ocupación temporal dentro de una edificación permanente (ej. un salón de eventos dentro de un edificio ya habilitado). Poco frecuente en propiedad horizontal.' },
  { value: 'PTT',   label: 'PTT — Temporal-Turístico',
    descripcion: 'Para establecimientos de uso turístico temporal. No aplica a edificios de vivienda habitual.' },
  { value: 'PP',    label: 'PP — Particulares',
    descripcion: 'Trámites de situaciones particulares que no encuadran en las categorías anteriores. Poco frecuente — si dudás, consultá con el técnico o la empresa.' },
]

export const DECRETOS_BOMBEROS = ['372/023', '260/013', '150/016', '184/018', '333/2000', 'Otro / sin datos'] as const

export const ESTADOS_BOMBEROS = ['Sin gestión', 'En trámite', 'Habilitado vigente', 'Plan gradual en curso', 'Vencido', 'Revocado'] as const

export const ETAPAS_PLAN_GRADUAL = ['C1', 'C2', 'C3', 'Completado'] as const

export const DOCS_TIPOS_BOMBEROS = ['Proyecto técnico', 'Declaración jurada', 'Certificado DNB', 'Presupuesto', 'Factura o recibo', 'Otro']

export function estadoBomberosBadgeClass(estado: string): string {
  if (estado === 'Habilitado vigente') return 'badge-success'
  if (estado === 'En trámite' || estado === 'Plan gradual en curso') return 'badge-warning'
  if (estado === 'Vencido' || estado === 'Revocado') return 'badge-danger'
  return 'badge-neutral'
}

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

export function formatFechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Arma un resumen legible (recargados por tipo, ensayo hidrostático, extras)
// de una gestión de extintores. Usado tanto en el historial como en las exportaciones.
export function detalleGestionTexto(tabla: MantTabla, r: {
  cant_co2?: number; cant_8kg?: number; cant_4kg?: number; cant_espuma?: number
  cant_ensayo_hidrostatico?: number; vencimiento_ensayo?: string | null
  extras?: Record<string, number> | null
}): string {
  if (tabla !== 'mant_extintores') return ''
  const partes: string[] = []
  const cant = (r.cant_co2 || 0) + (r.cant_8kg || 0) + (r.cant_4kg || 0) + (r.cant_espuma || 0)
  if (cant > 0) {
    const detalleTipos = TIPOS_EXTINTOR.map(t => ({ label: t.label, v: (r as any)[t.key] || 0 })).filter(t => t.v > 0)
    partes.push(`Recargados (${cant}): ${detalleTipos.map(t => `${t.label} ${t.v}`).join(' · ')}`)
  }
  if (r.vencimiento_ensayo) {
    partes.push(`Ensayo hidrostático: ${r.cant_ensayo_hidrostatico ? `${r.cant_ensayo_hidrostatico} realizados · ` : ''}vence ${formatFechaCorta(r.vencimiento_ensayo)}`)
  }
  const extrasActivos = EXTRAS_EXTINTORES.map(ex => ({ label: ex.label, v: r.extras?.[ex.key] || 0 })).filter(ex => ex.v > 0)
  if (extrasActivos.length > 0) {
    partes.push(`Extras: ${extrasActivos.map(ex => `${ex.label} ${ex.v}`).join(' · ')}`)
  }
  return partes.join('\n')
}
