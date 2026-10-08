// Supabase devuelve como máximo 1000 filas por consulta. Las tablas grandes (pagos ya pasa
// las 1000 filas) hay que traerlas de a páginas; si no, las filas que quedan afuera "desaparecen"
// y, por ejemplo, cuotas cobradas aparecen como vencidas.
// Uso: const pagos = await traerTodo(() => supabase.from('pagos').select('poliza_id, cuota_num').order('id'))
export async function traerTodo<T = any>(armarConsulta: () => any, tamPagina = 1000): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += tamPagina) {
    const { data, error } = await armarConsulta().range(desde, desde + tamPagina - 1)
    if (error) throw error
    filas.push(...((data || []) as T[]))
    if (!data || data.length < tamPagina) break
  }
  return filas
}
