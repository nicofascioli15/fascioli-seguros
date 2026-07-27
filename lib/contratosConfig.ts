// Configuración y lógica de cálculo del módulo Contratos.
// Las categorías (Ascensores, Rampas, Obras, y las que se agreguen desde Configuración)
// se guardan en la tabla contratos_categorias — no hay nada fijo en código, así que crear
// una categoría nueva alcanza para que aparezca en el nav y tenga su propia página.
//
// Cada categoría tiene un "tipo" que define cómo se calcula la vigencia:
//   'auto'     -> se renueva sola (fecha de firma + vigencia en años), calculado en vivo.
//   'garantia' -> fecha de inicio + fecha de fin fija + período de garantía (en meses o años).

export type TipoCategoria = 'auto' | 'garantia'
export type CategoriaRow = { id: string; slug: string; label: string; tipo: TipoCategoria; orden: number }

export async function fetchCategorias(supabase: any): Promise<CategoriaRow[]> {
  const { data } = await supabase.from('contratos_categorias').select('id, slug, label, tipo, orden').order('orden')
  return (data || []) as CategoriaRow[]
}

// Genera un slug simple y estable a partir del nombre visible (sin tildes, minúsculas, guiones).
export function slugify(s: string): string {
  const sinAcentos = s.trim().toLowerCase().normalize('NFD').split('').filter(ch => {
    const code = ch.charCodeAt(0)
    return code < 0x0300 || code > 0x036f
  }).join('')
  const base = sinAcentos.replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '')
  return base || 'categoria'
}

export function docsTipos(tipo: TipoCategoria): string[] {
  return tipo === 'garantia' ? ['Contrato', 'Garantía', 'Factura', 'Otro'] : ['Contrato', 'Factura', 'Otro']
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

// ── Unidad de la garantía (meses o años) ─────────────────────────────────────
// El cálculo interno siempre es en meses; estas funciones solo convierten lo que
// se escribe/lee en el formulario para poder cargarla como "6 meses" o "2 años".
export type UnidadGarantia = 'meses' | 'anios'

export function garantiaMesesDesde(valor: number, unidad: UnidadGarantia): number {
  return unidad === 'anios' ? Math.round(valor * 12) : Math.round(valor)
}

export function garantiaValorEnUnidad(meses: number, unidad: UnidadGarantia): number {
  return unidad === 'anios' ? Math.round(meses / 12) : meses
}

// ── Modelo auto-renovable (fecha de firma + vigencia en años) ────────────────

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

// ── Modelo de garantía (fecha fija + período de garantía) ────────────────────

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
