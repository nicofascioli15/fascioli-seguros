import type { Obra, PagoObra, LeyObra } from '@/lib/obrasConfig'
import { resumenPagos, resumenLeyes, garantiaObra, cierreBps, situacionObra, obraCerrada, hoyLocal } from '@/lib/obrasConfig'

export type ObraCompleta = Obra & {
  edificio: string
  pagos: PagoObra[]
  leyes: LeyObra[]
  rp: ReturnType<typeof resumenPagos>
  rl: ReturnType<typeof resumenLeyes>
  garantia: ReturnType<typeof garantiaObra>
  cierre: ReturnType<typeof cierreBps>
  situacion: ReturnType<typeof situacionObra>
  cerrada: boolean
}

// Columnas reales de la tabla "obras". Se usa para guardar en el historial solo lo que existe
// en la base (sin los campos calculados), así "Revertir" puede volver a escribirlo tal cual.
const COLUMNAS_OBRA = [
  'id', 'cliente_id', 'titulo', 'descripcion', 'empresa', 'tipo_obra', 'titular_bps', 'cierre_responsable', 'nro_obra_bps', 'fecha_inscripcion_bps',
  'moneda', 'precio_total', 'fecha_contrato', 'fecha_inicio', 'fecha_fin_prevista', 'fecha_fin_real', 'avance', 'estado',
  'tope_leyes', 'garantia_meses', 'garantia_unidad', 'cierre_bps_estado', 'cierre_bps_fecha', 'nota', 'created_at',
] as const
export function soloColumnasObra(o: any): Record<string, any> {
  const r: Record<string, any> = {}
  COLUMNAS_OBRA.forEach(k => { if (o && k in o) r[k] = o[k] })
  return r
}
export function soloColumnasLey(l: any): Record<string, any> {
  const { acumulado, aCargoEdificio, excedente, ...resto } = l || {}
  return resto
}

// Trae todas las obras con sus pagos y leyes y les calcula todo lo derivado
// (saldo, pagos vencidos, leyes vs tope, garantía, cierre BPS). Lo usan la lista,
// el dashboard, las fichas de edificio y el asistente IA, así todos ven los mismos números.
export async function fetchObrasCompletas(supabase: any, opts: { clienteId?: string; obraId?: string } = {}): Promise<ObraCompleta[]> {
  let q = supabase.from('obras').select('*, mant_clientes(nombre)').order('created_at', { ascending: false })
  if (opts.clienteId) q = q.eq('cliente_id', opts.clienteId)
  if (opts.obraId) q = q.eq('id', opts.obraId)
  const { data: obras, error } = await q
  if (error || !obras || obras.length === 0) return []

  const ids = obras.map((o: any) => o.id)
  const [{ data: pagos }, { data: leyes }] = await Promise.all([
    supabase.from('obras_pagos').select('*').in('obra_id', ids).order('orden'),
    supabase.from('obras_leyes').select('*').in('obra_id', ids).order('periodo'),
  ])
  const hoy = hoyLocal()
  return obras.map((o: any) => {
    const ps: PagoObra[] = (pagos || []).filter((p: any) => p.obra_id === o.id).map((p: any) => ({ ...p, monto: Number(p.monto || 0), porcentaje: p.porcentaje != null ? Number(p.porcentaje) : null }))
    const ls: LeyObra[] = (leyes || []).filter((l: any) => l.obra_id === o.id).map((l: any) => ({ ...l, monto: Number(l.monto || 0) }))
    const obra: Obra = {
      ...o,
      precio_total: o.precio_total != null ? Number(o.precio_total) : null,
      tope_leyes: o.tope_leyes != null ? Number(o.tope_leyes) : null,
    }
    return {
      ...obra,
      edificio: o.mant_clientes?.nombre || 'Sin edificio',
      pagos: ps,
      leyes: ls,
      rp: resumenPagos(obra.precio_total, ps, hoy),
      rl: resumenLeyes(obra.tope_leyes, ls),
      garantia: garantiaObra(obra, hoy),
      cierre: cierreBps(obra, hoy),
      situacion: situacionObra(obra, ps, hoy),
      cerrada: obraCerrada(obra, ps),
    }
  })
}
