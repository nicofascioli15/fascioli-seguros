// ============================================================================
// Obras — lógica central (la usan las pantallas, el dashboard y el asistente IA)
// ============================================================================

export type Moneda = 'UYU' | 'USD'
export type TipoObra = 'contrato' | 'administracion' | 'menor_cuantia'
export type TitularBps = 'edificio' | 'empresa'
export type EstadoObra = 'Presupuestada' | 'Contratada' | 'En ejecución' | 'Finalizada' | 'Cancelada'
export type CierreBps = 'No aplica' | 'Pendiente' | 'Presentado' | 'Aprobado'
export type TipoPago = 'entrega_inicial' | 'avance' | 'cuota' | 'final' | 'otro'

export type Obra = {
  id: string
  cliente_id: string
  titulo: string
  descripcion: string | null
  empresa: string | null
  tipo_obra: TipoObra
  titular_bps: TitularBps
  nro_obra_bps: string | null
  fecha_inscripcion_bps: string | null
  moneda: Moneda
  precio_total: number | null
  fecha_contrato: string | null
  fecha_inicio: string | null
  fecha_fin_prevista: string | null
  fecha_fin_real: string | null
  avance: number
  estado: EstadoObra
  tope_leyes: number | null
  garantia_meses: number
  garantia_unidad?: 'meses' | 'anios' | null
  cierre_bps_estado: CierreBps
  cierre_bps_fecha: string | null
  nota: string | null
  created_at: string
}

export type PagoObra = {
  id: string
  obra_id: string
  orden: number
  concepto: string
  tipo: TipoPago
  porcentaje: number | null
  monto: number
  fecha_prevista: string | null
  condicion: string | null
  pagado: boolean
  fecha_pago: string | null
  comprobante: string | null
}

export type LeyObra = {
  id: string
  obra_id: string
  periodo: string
  monto: number
  pagado: boolean
  fecha_pago: string | null
  comprobante: string | null
  nota: string | null
}

// ── Catálogos ──────────────────────────────────────────────────────────────

export const TIPOS_OBRA: { value: TipoObra; label: string; descripcion: string }[] = [
  { value: 'contrato', label: 'Por contrato (empresa)',
    descripcion: 'El edificio contrata a una empresa que ejecuta la obra. Se inscribe en BPS; según lo que se pacte, la obra queda a nombre del edificio o de la empresa.' },
  { value: 'administracion', label: 'Por administración',
    descripcion: 'El edificio contrata y administra directamente al personal. La obra queda a nombre del edificio y los aportes (leyes sociales) los factura BPS al edificio.' },
  { value: 'menor_cuantia', label: 'Menor cuantía',
    descripcion: 'Trabajos chicos: hasta 85 jornales, sin modificar planos ni permiso de construcción. Solo por contratista, y la obra queda a nombre del contratista (formulario F8).' },
]

export const ESTADOS_OBRA: EstadoObra[] = ['Presupuestada', 'Contratada', 'En ejecución', 'Finalizada', 'Cancelada']
export const CIERRES_BPS: CierreBps[] = ['Pendiente', 'Presentado', 'Aprobado', 'No aplica']

export const TIPOS_PAGO: { value: TipoPago; label: string }[] = [
  { value: 'entrega_inicial', label: 'Entrega inicial' },
  { value: 'avance', label: 'Por avance de obra' },
  { value: 'cuota', label: 'Cuota' },
  { value: 'final', label: 'Final de obra' },
  { value: 'otro', label: 'Otro' },
]

export const DOCS_TIPOS_OBRAS = [
  'Contrato', 'Presupuesto', 'Factura', 'Recibo', 'Planilla / factura BPS',
  'Inscripción BPS', 'Cierre de obra BPS (F9)', 'Garantía', 'Fotos', 'Otro',
]

// Días corridos que da BPS para comunicar el fin de la obra.
export const PLAZO_CIERRE_BPS_DIAS = 30
// Aviso cuando las leyes sociales facturadas llegan a este % del tope.
export const ALERTA_TOPE_LEYES = 0.8
// Aviso de garantía por vencer (días antes).
export const ALERTA_GARANTIA_DIAS = 60

// ── Fechas (hora de Uruguay, para no correr un día a la noche por UTC — también en el servidor) ──

export function hoyLocal(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

export function addDias(iso: string, dias: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d + dias)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function addMesesObra(iso: string, meses: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const raw = m - 1 + meses
  const ty = y + Math.floor(raw / 12)
  const tm = ((raw % 12) + 12) % 12
  const maxDay = new Date(ty, tm + 1, 0).getDate()
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, maxDay)).padStart(2, '0')}`
}

export function diasEntre(desde: string, hasta: string): number {
  const [y1, m1, d1] = desde.slice(0, 10).split('-').map(Number)
  const [y2, m2, d2] = hasta.slice(0, 10).split('-').map(Number)
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000)
}

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export function formatPeriodo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m] = iso.slice(0, 10).split('-')
  return `${MESES_CORTO[Number(m) - 1]} ${y}`
}

// ── Montos ─────────────────────────────────────────────────────────────────

export function redondear(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatMonto(n: number | null | undefined, moneda: Moneda = 'UYU'): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '—'
  const entero = Number.isInteger(Math.round(Number(n) * 100) / 100)
  const s = Number(n).toLocaleString('es-UY', { minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: 2 })
  return moneda === 'USD' ? `U$S ${s}` : `$ ${s}`
}

// ── Plan de pagos ──────────────────────────────────────────────────────────

export type ResumenPagos = {
  totalPlan: number
  totalPagado: number
  saldo: number              // precio_total (o plan, si no hay precio) - pagado
  pctPagado: number          // 0..1
  diferenciaPlan: number     // precio_total - totalPlan (0 = el plan cierra con el precio)
  vencidos: PagoObra[]       // sin pagar con fecha prevista pasada
  proximos: PagoObra[]       // sin pagar con fecha en los próximos `dias`
  sinFecha: PagoObra[]       // sin pagar y sujetos a una condición (avance, fin de obra)
  proximoPago: PagoObra | null
}

export function resumenPagos(precioTotal: number | null, pagos: PagoObra[], hoy = hoyLocal(), dias = 30): ResumenPagos {
  const totalPlan = redondear(pagos.reduce((s, p) => s + Number(p.monto || 0), 0))
  const totalPagado = redondear(pagos.filter(p => p.pagado).reduce((s, p) => s + Number(p.monto || 0), 0))
  const base = precioTotal ?? totalPlan
  const impagos = pagos.filter(p => !p.pagado)
  const vencidos = impagos.filter(p => p.fecha_prevista && p.fecha_prevista < hoy)
  const limite = addDias(hoy, dias)
  const proximos = impagos.filter(p => p.fecha_prevista && p.fecha_prevista >= hoy && p.fecha_prevista <= limite)
  const sinFecha = impagos.filter(p => !p.fecha_prevista)
  const conFecha = impagos.filter(p => p.fecha_prevista).sort((a, b) => (a.fecha_prevista! < b.fecha_prevista! ? -1 : 1))
  return {
    totalPlan,
    totalPagado,
    saldo: redondear(base - totalPagado),
    pctPagado: base > 0 ? Math.min(1, totalPagado / base) : 0,
    diferenciaPlan: precioTotal != null ? redondear(precioTotal - totalPlan) : 0,
    vencidos,
    proximos,
    sinFecha,
    proximoPago: conFecha[0] || sinFecha[0] || null,
  }
}

export type ParamsPlan = {
  precio: number
  inicialPct: number    // % entrega inicial (a la firma)
  avancePct: number     // % contra avance de obra
  avanceCondicion: string
  finalPct: number      // % al finalizar la obra
  cuotas: number        // cantidad de cuotas iguales para el resto
  fechaInicial: string  // fecha de la entrega inicial (firma)
  fechaPrimeraCuota: string
}

type PagoNuevo = Omit<PagoObra, 'id' | 'obra_id'>

// Arma el plan de pagos a partir de porcentajes + cuotas iguales. El resto que no cubren
// los porcentajes se reparte en cuotas mensuales iguales; la última cuota absorbe el
// redondeo para que la suma dé exacto el precio.
export function generarPlan(p: ParamsPlan): PagoNuevo[] {
  const items: PagoNuevo[] = []
  let orden = 1
  const precio = Number(p.precio) || 0
  const montoPct = (pct: number) => redondear(precio * (pct || 0) / 100)
  const base = { pagado: false, fecha_pago: null, comprobante: null } as const

  const inicial = montoPct(p.inicialPct)
  const avance = montoPct(p.avancePct)
  const final = montoPct(p.finalPct)
  if (inicial > 0) items.push({ ...base, orden: orden++, concepto: 'Entrega inicial', tipo: 'entrega_inicial', porcentaje: p.inicialPct, monto: inicial, fecha_prevista: p.fechaInicial || null, condicion: 'A la firma del contrato' })
  if (avance > 0) items.push({ ...base, orden: orden++, concepto: 'Pago por avance de obra', tipo: 'avance', porcentaje: p.avancePct, monto: avance, fecha_prevista: null, condicion: p.avanceCondicion || 'Según avance de obra' })

  const resto = redondear(precio - inicial - avance - final)
  const n = Math.max(0, Math.floor(p.cuotas || 0))
  if (n > 0 && resto > 0) {
    // Se redondea para abajo; la última cuota absorbe los centavos (nunca queda negativa).
    const cuota = Math.floor(resto * 100 / n) / 100
    for (let i = 0; i < n; i++) {
      const monto = i === n - 1 ? redondear(resto - cuota * (n - 1)) : cuota
      items.push({
        ...base, orden: orden++, concepto: `Cuota ${i + 1} de ${n}`, tipo: 'cuota',
        porcentaje: null, monto,
        fecha_prevista: p.fechaPrimeraCuota ? addMesesObra(p.fechaPrimeraCuota, i) : null,
        condicion: null,
      })
    }
  } else if (resto > 0 && final === 0) {
    // Sin cuotas ni pago final: el resto queda como saldo final para no perder plata en el plan.
    items.push({ ...base, orden: orden++, concepto: 'Saldo', tipo: 'otro', porcentaje: null, monto: resto, fecha_prevista: null, condicion: 'A definir' })
  }
  if (final > 0) {
    const montoFinal = n === 0 ? redondear(final + Math.max(0, resto)) : final
    items.push({ ...base, orden: orden++, concepto: 'Pago final', tipo: 'final', porcentaje: p.finalPct, monto: montoFinal, fecha_prevista: null, condicion: 'Al finalizar la obra' })
  }
  return items
}

export const PRESETS_PLAN: { id: string; label: string; ayuda: string; valores: Partial<ParamsPlan> }[] = [
  { id: 'inicial_cuotas', label: 'Inicial + cuotas', ayuda: 'Ej: 30% a la firma y el resto en 10 cuotas iguales',
    valores: { inicialPct: 30, avancePct: 0, finalPct: 0, cuotas: 10 } },
  { id: 'mitad_cuotas', label: '50% firma + cuotas', ayuda: 'Mitad a la firma y la otra mitad en cuotas iguales',
    valores: { inicialPct: 50, avancePct: 0, finalPct: 0, cuotas: 6 } },
  { id: '50_30_20', label: '50 / 30 / 20', ayuda: '50% a la firma, 30% por avance y 20% al terminar',
    valores: { inicialPct: 50, avancePct: 30, finalPct: 20, cuotas: 0 } },
  { id: 'inicial_avance_cuotas', label: 'Inicial + avance + cuotas', ayuda: 'Entrega inicial, un pago por avance y el resto en cuotas',
    valores: { inicialPct: 30, avancePct: 20, finalPct: 0, cuotas: 10 } },
]

// ── Leyes sociales con tope ────────────────────────────────────────────────

export type LeyCalculada = LeyObra & { acumulado: number; aCargoEdificio: number; excedente: number }

export type ResumenLeyes = {
  tope: number | null
  totalFacturado: number
  totalACargoEdificio: number   // nunca supera el tope
  excedente: number             // lo que pasa el tope -> lo absorbe la empresa
  disponible: number | null     // cuánto falta para llegar al tope (negativo si se pasó)
  pctTope: number | null        // 0..∞ (1 = llegó al tope)
  totalPagado: number
  pendientePago: number
  alerta: 'ok' | 'cerca' | 'excedido' | 'sin_tope'
  detalle: LeyCalculada[]
}

// Recorre las leyes en orden cronológico: mientras el acumulado no pase el tope, todo lo
// asume el edificio; lo que lo supera queda como excedente a cargo de la empresa
// (según contrato se paga como máximo el tope).
export function resumenLeyes(topeIn: number | null, leyes: LeyObra[]): ResumenLeyes {
  const tope = topeIn != null && topeIn > 0 ? topeIn : null   // tope 0 = sin tope
  const ordenadas = [...leyes].sort((a, b) => (a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : 0))
  let acumulado = 0
  const detalle: LeyCalculada[] = ordenadas.map(l => {
    const monto = Number(l.monto || 0)
    const previo = acumulado
    acumulado = redondear(acumulado + monto)
    let aCargoEdificio = monto
    if (tope != null) aCargoEdificio = redondear(Math.max(0, Math.min(monto, tope - previo)))
    return { ...l, acumulado, aCargoEdificio, excedente: redondear(monto - aCargoEdificio) }
  })
  const totalFacturado = acumulado
  const totalACargoEdificio = redondear(detalle.reduce((s, d) => s + d.aCargoEdificio, 0))
  const excedente = redondear(totalFacturado - totalACargoEdificio)
  const totalPagado = redondear(ordenadas.filter(l => l.pagado).reduce((s, l) => s + Number(l.monto || 0), 0))
  const pctTope = tope != null && tope > 0 ? totalFacturado / tope : null
  let alerta: ResumenLeyes['alerta'] = 'sin_tope'
  if (pctTope != null) alerta = pctTope > 1 ? 'excedido' : pctTope >= ALERTA_TOPE_LEYES ? 'cerca' : 'ok'
  return {
    tope, totalFacturado, totalACargoEdificio, excedente,
    disponible: tope != null ? redondear(tope - totalFacturado) : null,
    pctTope, totalPagado, pendientePago: redondear(totalFacturado - totalPagado), alerta, detalle,
  }
}

// ── Garantía post-obra ─────────────────────────────────────────────────────

// 'sin_fin' = todavía no hay fecha desde la cual contar la garantía.
export type EstadoGarantia = { estado: 'sin_fin' | 'en_garantia' | 'vencida'; hasta: string | null; dias: number | null; porVencer: boolean }

// La garantía se cuenta desde la firma del contrato (si no está cargada, desde el fin de la obra).
export function garantiaObra(o: Pick<Obra, 'fecha_contrato' | 'fecha_fin_real' | 'garantia_meses'>, hoy = hoyLocal()): EstadoGarantia {
  const base = o.fecha_contrato || o.fecha_fin_real
  if (!base || !o.garantia_meses) return { estado: 'sin_fin', hasta: null, dias: null, porVencer: false }
  const hasta = addMesesObra(base, o.garantia_meses)
  const dias = diasEntre(hoy, hasta)
  if (dias < 0) return { estado: 'vencida', hasta, dias, porVencer: false }
  return { estado: 'en_garantia', hasta, dias, porVencer: dias <= ALERTA_GARANTIA_DIAS }
}

// ── Cierre de obra ante BPS (ex F9) ────────────────────────────────────────

export type EstadoCierre = {
  aplica: boolean
  responsable: 'edificio' | 'empresa'
  limite: string | null       // fin real + 30 días corridos
  dias: number | null         // días hasta el límite (negativo = vencido)
  vencido: boolean
  pendiente: boolean          // obra terminada y cierre todavía sin presentar
}

export function cierreBps(o: Pick<Obra, 'fecha_fin_real' | 'cierre_bps_estado' | 'titular_bps' | 'tipo_obra'>, hoy = hoyLocal()): EstadoCierre {
  const responsable = o.tipo_obra === 'menor_cuantia' || o.titular_bps === 'empresa' ? 'empresa' : 'edificio'
  if (o.cierre_bps_estado === 'No aplica') return { aplica: false, responsable, limite: null, dias: null, vencido: false, pendiente: false }
  if (!o.fecha_fin_real) return { aplica: true, responsable, limite: null, dias: null, vencido: false, pendiente: false }
  const limite = addDias(o.fecha_fin_real, PLAZO_CIERRE_BPS_DIAS)
  const dias = diasEntre(hoy, limite)
  const pendiente = o.cierre_bps_estado === 'Pendiente'
  return { aplica: true, responsable, limite, dias, vencido: pendiente && dias < 0, pendiente }
}

// ── Situación general (para listas y badges) ───────────────────────────────

export function situacionObra(o: Obra, hoy = hoyLocal()): { label: string; cls: string } {
  if (o.estado === 'Cancelada') return { label: 'Cancelada', cls: 'badge-neutral' }
  if (o.estado === 'Presupuestada') return { label: 'Presupuestada', cls: 'badge-neutral' }
  if (o.estado === 'Contratada') return { label: 'Contratada', cls: 'badge-gold' }
  if (o.estado === 'En ejecución' || !o.fecha_fin_real) return { label: 'En ejecución', cls: 'badge-warning' }
  const c = cierreBps(o, hoy)
  if (c.pendiente) return { label: c.vencido ? 'Cierre BPS vencido' : 'Falta cierre BPS', cls: 'badge-danger' }
  const g = garantiaObra(o, hoy)
  if (g.estado === 'en_garantia') return { label: g.porVencer ? 'Garantía por vencer' : 'En garantía', cls: g.porVencer ? 'badge-warning' : 'badge-success' }
  return { label: 'Terminada', cls: 'badge-neutral' }
}

export function textoGarantia(meses: number, unidad?: string | null): string {
  if (!meses) return 'Sin garantía'
  const enAnios = unidad === 'anios' || (!unidad && meses % 12 === 0)
  if (enAnios && meses % 12 === 0) { const a = meses / 12; return `${a} ${a === 1 ? 'año' : 'años'}` }
  return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
}

export function obraActiva(o: Pick<Obra, 'estado'>): boolean {
  return o.estado === 'Contratada' || o.estado === 'En ejecución'
}
