// Los edificios (mant_clientes) son la MISMA cartera para Mantenimiento, Contratos y Obras —
// una sola tabla compartida. Por eso, dar de alta un edificio en cualquier módulo ya lo hace
// aparecer automáticamente en los demás (leen y escriben la misma tabla).
// Esta función centraliza el borrado completo de un edificio: limpia primero los archivos
// adjuntos en Storage (extintores, tanques, bomberos, contratos y obras) y después borra el
// edificio, lo que dispara el ON DELETE CASCADE de todas las tablas hijas en la base —
// dejando el edificio eliminado de todos los módulos a la vez.
export async function eliminarEdificioCompleto(supabase: any, clienteId: string) {
  const [{ data: ext }, { data: tan }, { data: bom }, { data: contratos }, { data: obras }] = await Promise.all([
    supabase.from('mant_extintores').select('id').eq('cliente_id', clienteId),
    supabase.from('mant_tanques').select('id').eq('cliente_id', clienteId),
    supabase.from('mant_bomberos').select('id').eq('cliente_id', clienteId),
    supabase.from('contratos').select('id').eq('cliente_id', clienteId),
    supabase.from('obras').select('id').eq('cliente_id', clienteId),
  ])
  const ids = (rows: any) => (rows || []).map((r: any) => r.id)

  const consultas: [string, string, string[]][] = [
    ['mant_documentos', 'extintor_id', ids(ext)],
    ['mant_documentos', 'tanque_id', ids(tan)],
    ['mant_documentos', 'bombero_id', ids(bom)],
    ['contratos_documentos', 'contrato_id', ids(contratos)],
    ['obras_documentos', 'obra_id', ids(obras)],
  ]

  const storagePaths: string[] = []
  for (const [tabla, col, lista] of consultas) {
    if (lista.length === 0) continue
    const { data } = await supabase.from(tabla).select('storage_path').in(col, lista)
    ;(data || []).forEach((d: any) => d.storage_path && storagePaths.push(d.storage_path))
  }
  if (storagePaths.length > 0) {
    await supabase.storage.from('documentos').remove(storagePaths)
  }

  return supabase.from('mant_clientes').delete().eq('id', clienteId)
}
