// ============================================================================
// Asambleas — tipos y cálculo de resultados (lo usan la ficha, la tablet y el acta)
// ============================================================================

export type ModoConteo = 'unidad' | 'coeficiente' | 'ambos'
export type Mayoria = 'simple' | 'absoluta' | 'dos_tercios' | 'tres_cuartos' | 'unanimidad'
export type BaseMayoria = 'presentes' | 'edificio'
export type Voto = 'si' | 'no' | 'abstencion'
export type EstadoMocion = 'pendiente' | 'votando' | 'cerrada'

export type Asamblea = {
  id: string
  edificio_id: string | null
  fecha: string
  tipo: 'Ordinaria' | 'Extraordinaria'
  convocatoria: 'Primera' | 'Segunda'
  modo_conteo: ModoConteo
  total_unidades: number | null
  total_coeficiente: number | null
  lugar: string | null
  notas: string | null
  estado: 'abierta' | 'cerrada'
  created_at: string
}

export type UnidadAsamblea = {
  id: string
  asamblea_id: string
  unidad: string
  propietario: string | null
  coeficiente: number | null
  por_poder: boolean
  apoderado: string | null
  propietario_tel?: string | null
  apoderado_tel?: string | null
  created_at: string
}

export type Mocion = {
  id: string
  asamblea_id: string
  orden: number
  titulo: string
  descripcion: string | null
  mayoria: Mayoria
  base: BaseMayoria
  estado: EstadoMocion
  aprobada: boolean | null
  resultado: string | null
  created_at: string
}

export type VotoRow = { id: string; mocion_id: string; unidad_id: string; voto: Voto; created_at: string }

export const MODOS_CONTEO: { value: ModoConteo; label: string; ayuda: string }[] = [
  { value: 'unidad', label: 'Por unidad', ayuda: 'Cada unidad vale 1 voto.' },
  { value: 'coeficiente', label: 'Por coeficiente', ayuda: 'Cada unidad vota con su porcentaje de propiedad, según el reglamento de copropiedad.' },
  { value: 'ambos', label: 'Unidades y coeficiente', ayuda: 'Para aprobar se tiene que cumplir la mayoría en cantidad de unidades Y en coeficiente (ej. "3/4 de los copropietarios que representen 3/4 del valor").' },
]

export const MAYORIAS: { value: Mayoria; label: string; ayuda: string }[] = [
  { value: 'simple', label: 'Mayoría simple', ayuda: 'Más votos a favor que en contra. Las abstenciones no cuentan.' },
  { value: 'absoluta', label: 'Mayoría absoluta (más de la mitad)', ayuda: 'Los votos a favor tienen que ser más de la mitad de la base.' },
  { value: 'dos_tercios', label: 'Dos tercios (2/3)', ayuda: 'Los votos a favor tienen que llegar a 2/3 de la base.' },
  { value: 'tres_cuartos', label: 'Tres cuartos (3/4)', ayuda: 'Los votos a favor tienen que llegar a 3/4 de la base.' },
  { value: 'unanimidad', label: 'Unanimidad', ayuda: 'Todos los de la base tienen que votar a favor.' },
]

export const BASES: { value: BaseMayoria; label: string; ayuda: string }[] = [
  { value: 'presentes', label: 'Sobre los presentes', ayuda: 'Se cuenta sobre las unidades acreditadas en la asamblea (presentes + por poder).' },
  { value: 'edificio', label: 'Sobre el total del edificio', ayuda: 'Se cuenta sobre todas las unidades del edificio, estén o no en la asamblea.' },
]

export const VOTOS: { value: Voto; label: string; color: string; bg: string }[] = [
  { value: 'si', label: 'A favor', color: '#15803D', bg: '#DCFCE7' },
  { value: 'no', label: 'En contra', color: '#B91C1C', bg: '#FEE2E2' },
  { value: 'abstencion', label: 'Abstención', color: '#475569', bg: '#E2E8F0' },
]

export const votoLabel = (v: Voto) => VOTOS.find(x => x.value === v)?.label || v
export const mayoriaLabel = (m: Mayoria) => MAYORIAS.find(x => x.value === m)?.label || m
export const baseLabel = (b: BaseMayoria) => BASES.find(x => x.value === b)?.label || b

// Quién vota físicamente por una unidad: el apoderado si es por poder, si no el propietario.
export function votante(u: UnidadAsamblea): string {
  const n = (u.por_poder ? u.apoderado : u.propietario) || ''
  return n.trim() || `Unidad ${u.unidad}`
}
export const claveVotante = (u: UnidadAsamblea) => votante(u).trim().toLowerCase()

// Agrupa las unidades por la persona que vota (una persona con poderes vota por varias).
export function agruparPorVotante(unidades: UnidadAsamblea[]): { nombre: string; unidades: UnidadAsamblea[] }[] {
  const m = new Map<string, { nombre: string; unidades: UnidadAsamblea[] }>()
  unidades.forEach(u => {
    const k = claveVotante(u)
    if (!m.has(k)) m.set(k, { nombre: votante(u), unidades: [] })
    m.get(k)!.unidades.push(u)
  })
  return Array.from(m.values())
    .map(g => ({ ...g, unidades: g.unidades.sort(ordenUnidad) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function ordenUnidad(a: { unidad: string }, b: { unidad: string }) {
  return a.unidad.localeCompare(b.unidad, 'es', { numeric: true })
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// ── Resultado de una moción ──────────────────────────────────────────────

export type Conteo = { si: number; no: number; abstencion: number; sinVotar: number; presentes: number; base: number }

export type Resultado = {
  unidades: Conteo
  coeficiente: Conteo
  usaUnidades: boolean
  usaCoeficiente: boolean
  okUnidades: boolean | null
  okCoeficiente: boolean | null
  aprobada: boolean
  necesario: string          // texto: qué hacía falta
  faltanCoeficientes: boolean
  faltaTotalEdificio: boolean
}

const FRACCION: Record<Exclude<Mayoria, 'simple'>, number> = { absoluta: 0.5, dos_tercios: 2 / 3, tres_cuartos: 3 / 4, unanimidad: 1 }

function cumple(c: Conteo, mayoria: Mayoria): boolean {
  if (mayoria === 'simple') return c.si > c.no
  const f = FRACCION[mayoria]
  if (c.base <= 0) return false
  // absoluta = más de la mitad; el resto = llegar a la fracción (con tolerancia por redondeo)
  return mayoria === 'absoluta' ? c.si > c.base * f : c.si + 1e-9 >= c.base * f
}

export function calcularResultado(a: Pick<Asamblea, 'modo_conteo' | 'total_unidades' | 'total_coeficiente'>, m: Pick<Mocion, 'mayoria' | 'base'>, unidades: UnidadAsamblea[], votos: Pick<VotoRow, 'unidad_id' | 'voto'>[]): Resultado {
  const votoDe = new Map(votos.map(v => [v.unidad_id, v.voto]))
  const usaUnidades = a.modo_conteo !== 'coeficiente'
  const usaCoeficiente = a.modo_conteo !== 'unidad'
  const cu: Conteo = { si: 0, no: 0, abstencion: 0, sinVotar: 0, presentes: unidades.length, base: 0 }
  const cc: Conteo = { si: 0, no: 0, abstencion: 0, sinVotar: 0, presentes: 0, base: 0 }
  let faltanCoeficientes = false
  unidades.forEach(u => {
    const coef = Number(u.coeficiente || 0)
    if (usaCoeficiente && (u.coeficiente == null || coef <= 0)) faltanCoeficientes = true
    cc.presentes += coef
    const v = votoDe.get(u.id)
    if (!v) { cu.sinVotar++; cc.sinVotar += coef; return }
    cu[v]++; cc[v] += coef
  })
  const totalU = a.total_unidades && a.total_unidades > 0 ? a.total_unidades : null
  const totalC = a.total_coeficiente && a.total_coeficiente > 0 ? Number(a.total_coeficiente) : null
  const faltaTotalEdificio = m.base === 'edificio' && ((usaUnidades && !totalU) || (usaCoeficiente && !totalC))
  cu.base = m.base === 'edificio' ? (totalU ?? cu.presentes) : cu.presentes
  cc.base = m.base === 'edificio' ? (totalC ?? cc.presentes) : cc.presentes
  ;(['si', 'no', 'abstencion', 'sinVotar', 'presentes', 'base'] as const).forEach(k => { cc[k] = r2(cc[k]) })

  const okUnidades = usaUnidades ? cumple(cu, m.mayoria) : null
  const okCoeficiente = usaCoeficiente ? cumple(cc, m.mayoria) : null
  const aprobada = (okUnidades ?? true) && (okCoeficiente ?? true)

  let necesario = ''
  if (m.mayoria === 'simple') necesario = 'más votos a favor que en contra'
  else {
    const f = FRACCION[m.mayoria]
    const partes: string[] = []
    if (usaUnidades) {
      const n = m.mayoria === 'absoluta' ? Math.floor(cu.base * f) + 1 : Math.ceil(cu.base * f - 1e-9)
      partes.push(`${n} de ${cu.base} unidades a favor`)
    }
    if (usaCoeficiente) partes.push(`${m.mayoria === 'absoluta' ? 'más de ' : ''}${r2(cc.base * f)}% de ${cc.base}% en coeficiente a favor`)
    necesario = partes.join(' y ')
  }
  return { unidades: cu, coeficiente: cc, usaUnidades, usaCoeficiente, okUnidades, okCoeficiente, aprobada, necesario, faltanCoeficientes, faltaTotalEdificio }
}

export function textoResultado(r: Resultado): string {
  const partes: string[] = []
  if (r.usaUnidades) partes.push(`Unidades: ${r.unidades.si} a favor, ${r.unidades.no} en contra, ${r.unidades.abstencion} abstenciones${r.unidades.sinVotar ? `, ${r.unidades.sinVotar} sin votar` : ''}`)
  if (r.usaCoeficiente) partes.push(`Coeficiente: ${r.coeficiente.si}% a favor, ${r.coeficiente.no}% en contra, ${r.coeficiente.abstencion}% abstenciones`)
  return `${r.aprobada ? 'APROBADA' : 'RECHAZADA'} — ${partes.join(' · ')}`
}

// Quórum: cuánto del edificio está presente o representado.
export function quorum(a: Pick<Asamblea, 'total_unidades' | 'total_coeficiente'>, unidades: UnidadAsamblea[]) {
  const presentes = unidades.length
  const coef = r2(unidades.reduce((s, u) => s + Number(u.coeficiente || 0), 0))
  const porPoder = unidades.filter(u => u.por_poder).length
  return {
    presentes, porPoder, coef,
    pctUnidades: a.total_unidades ? presentes / a.total_unidades : null,
    pctCoef: a.total_coeficiente ? coef / Number(a.total_coeficiente) : null,
  }
}

export function formatFechaAsamblea(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
