// Configuración y lógica de cálculo del módulo Contratos.
// El modelo "auto-renovable" (ascensor / rampa / servicio) replica exactamente
// las fórmulas de la planilla Excel de referencia (fecha de firma + vigencia en años),
// pero se calcula en vivo — no se guarda ningún estado de renovación en la base.
// El modelo "obra" es distinto: fecha de inicio + fecha de fin fija + período de garantía.

export type Categoria = 'ascensor' | 'rampa' | 'servicio' | 'obra'

export const CATEGORIAS: { value: Categoria; label: string; auto: boolean; ruta: string }[] = [
  { value: 'ascensor', label: 'Ascensores',      auto: true,  ruta: '/contratos/ascensores' },
  { value: 'rampa',    label: 'Rampas',           auto: true,  ruta: '/contratos/rampas' },
  { value: 'servicio', label: 'Otros servicios',  auto: true,  ruta: '/contratos/servicios' },
  { value: 'obra',     label: 'Obras',            auto: false, ruta: '/contratos/obras' },
]

export function categoriaLabel(c: string): string {
  return CATEGORIAS.find(cat => cat.value === c)?.label || c
}

export function esAutoRenovable(c: string): boolean {
  return CATEGORIAS.find(cat => cat.value === c)?.auto ?? true
}

export const DOCS_TIPOS: Record<Categoria, string[]> = {
  ascensor: ['Contrato', 'Factura', 'Otro'],
  rampa: ['Contrato', 'Factura', 'Otro'],
  servicio: ['Contrato', 'Factura', 'Otro'],
  obra: ['Contrato', 'Garantía', 'Factura', 'Otro'],
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function diasHasta(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Suma años calendario a una fecha 'YYYY-MM-DD' (equivalente a EDATE de Excel), clampeando fin de mes.
export function addAnios(iso: string, anios: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const targetYear = y + anios
  const maxDay = new Date(targetYear, m, 0).getDate()
  return `${targetYear}-${String(m).padStart(2, '0')}-${String(Math.min(d, maxDay)).padStart(2, '0')}`
}

// Suma meses a una fecha 'YYYY-MM-DD', clampeando fin de mes.
export function addMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const targetMonthRaw = m - 1 + meses
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = ((targetMonthRaw % 12) + 12) % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(d, maxDay)).padStart(2, '0')}`
}

// ── Modelo auto-renovable (ascensor / rampa / servicio) ──────────────────────

// Cantidad de renovaciones ya cumplidas a hoy (equivalente a MAX(0, INT(YEARFRAC/vigencia)) del Excel,
// pero calculado por aniversarios exactos en vez de aproximación por fracción de año).
export function renovacionesAcumuladas(fechaFirma: string, vigenciaAnios: number, hoy = hoyISO()): number {
  if (!fechaFirma || !vigenciaAnios) return 0
  let k = 0
  while (k < 200 && addAnios(fechaFirma, vigenciaAnios * (k + 1)) <= hoy) k++
  return k
}

export function ultimaRenovacionVigente(fechaFirma: string, vigenciaAnios: number, renovaciones: number): string {
  return addAnios(fechaFirma, vigenciaAnios * renovaciones)
}

export function proximoVencimiento(fechaFirma: string, vigenciaAnios: number, renovaciones: number): string {
  return addAnios(fechaFirma, vigenciaAnios * (renovaciones + 1))
}

export type EstadoAuto = 'Renovado hoy' | 'Por vencer' | 'Seguimiento' | 'Vigente'

// Umbrales tomados tal cual de la planilla: Por vencer <=95 días, Seguimiento <=180 días, si no Vigente.
export function estadoAuto(dias: number, renovaciones: number, ultimaRenovVigente: string, hoy = hoyISO()): EstadoAuto {
  if (renovaciones > 0 && ultimaRenovVigente === hoy) return 'Renovado hoy'
  if (dias <= 95) return 'Por vencer'
  if (dias <= 180) return 'Seguimiento'
  return 'Vigente'
}

export function estadoAutoBadge(estado: EstadoAuto | null): { label: string; cls: string } {
  if (!estado) return { label: 'Sin datos', cls: 'badge-neutral' }
  if (estado === 'Renovado hoy') return { label: 'Renovado hoy', cls: 'badge-blue' }
  if (estado === 'Por vencer') return { label: 'Por vencer', cls: 'badge-danger' }
  if (estado === 'Seguimiento') return { label: 'Seguimiento', cls: 'badge-warning' }
  return { label: 'Vigente', cls: 'badge-success' }
}

// Calcula todos los derivados de un contrato auto-renovable a partir de fecha_firma_inicio + vigencia_anios.
// Devuelve null si faltan datos (equivalente a las celdas en blanco del Excel).
export function calcularAuto(fechaFirma: string | null, vigenciaAnios: number | null, hoy = hoyISO()) {
  if (!fechaFirma || !vigenciaAnios) return null
  const renovaciones = renovacionesAcumuladas(fechaFirma, vigenciaAnios, hoy)
  const ultimaVigente = ultimaRenovacionVigente(fechaFirma, vigenciaAnios, renovaciones)
  const proximoVenc = proximoVencimiento(fechaFirma, vigenciaAnios, renovaciones)
  const dias = diasHasta(proximoVenc)!
  const estado = estadoAuto(dias, renovaciones, ultimaVigente, hoy)
  return { renovaciones, ultimaVigente, proximoVenc, dias, estado }
}

// ── Modelo de obra (fecha fija + garantía) ───────────────────────────────────

export type EstadoObra = 'En ejecución' | 'En garantía' | 'Garantía vencida'

export function garantiaHasta(fechaFin: string, garantiaMeses: number): string {
  return addMeses(fechaFin, garantiaMeses || 0)
}

export function estadoObra(fechaFin: string, garantiaMeses: number, hoy = hoyISO()): EstadoObra {
  if (hoy < fechaFin) return 'En ejecución'
  const gh = garantiaHasta(fechaFin, garantiaMeses)
  if (hoy < gh) return 'En garantía'
  return 'Garantía vencida'
}

export function estadoObraBadge(estado: EstadoObra | null): { label: string; cls: string } {
  if (!estado) return { label: 'Sin datos', cls: 'badge-neutral' }
  if (estado === 'En ejecución') return { label: 'En ejecución', cls: 'badge-warning' }
  if (estado === 'En garantía') return { label: 'En garantía', cls: 'badge-success' }
  return { label: 'Garantía vencida', cls: 'badge-neutral' }
}

export function calcularObra(fechaFin: string | null, garantiaMeses: number | null, hoy = hoyISO()) {
  if (!fechaFin) return null
  const gh = garantiaHasta(fechaFin, garantiaMeses || 0)
  const estado = estadoObra(fechaFin, garantiaMeses || 0, hoy)
  return { garantiaHasta: gh, estado }
}
