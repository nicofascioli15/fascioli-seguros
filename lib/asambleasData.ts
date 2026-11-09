import { registrarAudit } from '@/lib/audit'
import { traerTodo } from '@/lib/traerTodo'
import { calcularResultado, textoResultado, ordenUnidad, type Asamblea, type Mocion, type UnidadAsamblea, type VotoRow } from '@/lib/asambleas'

export type AsambleaCompleta = {
  asamblea: Asamblea
  edificio: string
  direccion: string | null
  unidades: UnidadAsamblea[]
  mociones: Mocion[]
  votos: VotoRow[]
}

// Trae una asamblea con todo lo que cuelga de ella.
export async function fetchAsamblea(supabase: any, id: string): Promise<AsambleaCompleta | null> {
  const { data: a, error } = await supabase.from('asambleas').select('*, asam_edificios(nombre, direccion)').eq('id', id).maybeSingle()
  if (error || !a) return null
  const [{ data: us }, { data: ms }] = await Promise.all([
    supabase.from('asamblea_unidades').select('*').eq('asamblea_id', id),
    supabase.from('asamblea_mociones').select('*').eq('asamblea_id', id).order('orden').order('created_at'),
  ])
  const ids = (ms || []).map((m: any) => m.id)
  const vs = ids.length ? await traerTodo(() => supabase.from('asamblea_votos').select('*').in('mocion_id', ids).order('id')).catch(() => []) : []
  const { asam_edificios, ...asamblea } = a
  return {
    asamblea: { ...asamblea, total_coeficiente: asamblea.total_coeficiente != null ? Number(asamblea.total_coeficiente) : null },
    edificio: asam_edificios?.nombre || 'Sin edificio',
    direccion: asam_edificios?.direccion || null,
    unidades: (us || []).map((u: any) => ({ ...u, coeficiente: u.coeficiente != null ? Number(u.coeficiente) : null })).sort(ordenUnidad),
    mociones: ms || [],
    votos: vs || [],
  }
}

// Cierra la votación de una moción: calcula el resultado con los votos guardados y lo deja registrado.
export async function cerrarVotacion(supabase: any, data: AsambleaCompleta, mocion: Mocion): Promise<{ error?: string }> {
  const { data: votos, error: e1 } = await supabase.from('asamblea_votos').select('*').eq('mocion_id', mocion.id)
  if (e1) return { error: e1.message }
  const r = calcularResultado(data.asamblea, mocion, data.unidades, votos || [])
  const cambios = { estado: 'cerrada', aprobada: r.aprobada, resultado: textoResultado(r) }
  const { error } = await supabase.from('asamblea_mociones').update(cambios).eq('id', mocion.id)
  if (error) return { error: error.message }
  await registrarAudit({
    accion: 'editar', tabla: 'asamblea_mociones', registroId: mocion.id,
    descripcion: `Votación cerrada: "${mocion.titulo}" — ${r.aprobada ? 'APROBADA' : 'RECHAZADA'} — ${data.edificio}`,
    datosAntes: { estado: mocion.estado, aprobada: mocion.aprobada, resultado: mocion.resultado }, datosDespues: cambios,
  })
  return {}
}
