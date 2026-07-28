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

// Texto corto de días restantes/vencidos, para saber a tiempo cuándo hay que mandar el
// telegrama (con margen, antes de los 90 días de vencimiento).
export function formatDias(dias: number | null): string {
  if (dias === null) return ''
  if (dias === 0) return 'vence hoy'
  if (dias < 0) return `vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
  return `vence en ${dias} ${dias === 1 ? 'día' : 'días'}`
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
// "auto" = fecha de firma + vigencia en años. Si llega la fecha de vencimiento y
// nadie lo renovó a mano, el sistema lo da por renovado automáticamente con las
// mismas condiciones (misma empresa/tipo/vigencia) — igual que pasa en la
// realidad con estos contratos de mantenimiento — y lo marca "Auto-renovado"
// para poder revisarlo cuando haya tiempo. El botón "Renovar" sigue disponible
// en cualquier momento para cargar a mano un cambio real (otra empresa, otra
// vigencia, etc.), lo que crea un contrato nuevo y marca el anterior "Renovado".

export function vencimientoAuto(fechaFirma: string, vigenciaAnios: number): string {
  return addAnios(fechaFirma, vigenciaAnios)
}

export type EstadoAuto = 'Vencido' | 'Por vencer' | 'Seguimiento' | 'Vigente'

// Umbrales tomados de la planilla original: Por vencer <=95 días, Seguimiento <=180 días, si no Vigente.
export function estadoAuto(dias: number): EstadoAuto {
  if (dias < 0) return 'Vencido'
  if (dias <= 95) return 'Por vencer'
  if (dias <= 180) return 'Seguimiento'
  return 'Vigente'
}

export function estadoAutoBadge(estado: EstadoAuto | null, renovado?: boolean): { label: string; cls: string } {
  if (renovado) return { label: 'Renovado', cls: 'badge-blue' }
  if (!estado) return { label: 'Sin datos', cls: 'badge-neutral' }
  if (estado === 'Vencido') return { label: 'Vencido', cls: 'badge-danger' }
  if (estado === 'Por vencer') return { label: 'Por vencer', cls: 'badge-danger' }
  if (estado === 'Seguimiento') return { label: 'Seguimiento', cls: 'badge-warning' }
  return { label: 'Vigente', cls: 'badge-success' }
}

// Calcula el vencimiento y estado de un contrato auto-renovable a partir de fecha_firma_inicio + vigencia_anios.
// Si ya pasaron uno o más ciclos completos de vigencia sin renovación manual, avanza el cálculo
// ciclo por ciclo (mismas condiciones) hasta el ciclo vigente hoy, y marca autoRenovado = true.
// Devuelve null si faltan datos.
export function calcularAuto(fechaFirma: string | null, vigenciaAnios: number | null, hoy = hoyISO()) {
  if (!fechaFirma || !vigenciaAnios || vigenciaAnios <= 0) return null
  let ciclos = 0
  while (ciclos < 500 && addAnios(fechaFirma, vigenciaAnios * (ciclos + 1)) <= hoy) {
    ciclos++
  }
  const inicioCiclo = ciclos > 0 ? addAnios(fechaFirma, vigenciaAnios * ciclos) : fechaFirma
  const vencimiento = addAnios(inicioCiclo, vigenciaAnios)
  const dias = diasHasta(vencimiento)!
  const estado = estadoAuto(dias)
  return { vencimiento, dias, estado, autoRenovado: ciclos > 0, inicioCiclo, ciclos }
}

// Devuelve la fecha de inicio de cada ciclo de vigencia completado entre "fechaInicio" (exclusive)
// y "hasta" (inclusive) — se usa para reconstruir el historial de renovaciones automáticas de un
// contrato/tramo, sin necesidad de guardar cada ciclo en la base de datos (se recalcula siempre igual).
export function enumerarCiclosAuto(fechaInicio: string, vigenciaAnios: number, hasta: string): string[] {
  const fechas: string[] = []
  if (!vigenciaAnios || vigenciaAnios <= 0) return fechas
  let i = 1
  while (i < 500) {
    const f = addAnios(fechaInicio, vigenciaAnios * i)
    if (f > hasta) break
    fechas.push(f)
    i++
  }
  return fechas
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

// ── Orden por defecto (antes de aplicar cualquier orden que elija el usuario) ─
// Siempre primero lo que hay que atender: a vencer/vencido, después seguimiento,
// y al final lo que está resuelto (vigente, en garantía, renovado, etc).
export function prioridadEstado(label: string): number {
  switch (label) {
    case 'Vencido':
    case 'Por vencer':
    case 'En ejecución':
      return 0
    case 'Seguimiento':
      return 1
    case 'Vigente':
    case 'En garantía':
      return 2
    case 'Garantía vencida':
    case 'Renovado':
      return 3
    default:
      return 4
  }
}
