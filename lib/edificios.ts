// Los edificios (mant_clientes) son la MISMA cartera para Mantenimiento y Contratos —
// una sola tabla compartida. Por eso, dar de alta un edificio en cualquiera de los dos
// módulos ya lo hace aparecer automáticamente en el otro (leen y escriben la misma tabla).
// Esta función centraliza el borrado completo de un edificio: limpia primero los archivos
// adjuntos en Storage (extintores, tanques y contratos) y después borra el edificio, lo que
// dispara el ON DELETE CASCADE de mant_extintores, mant_tanques, contratos y sus documentos
// en la base — dejando el edificio eliminado de ambos módulos a la vez.
export async function eliminarEdificioCompleto(supabase: any, clienteId: string) {
  const [{ data: ext }, { data: tan }, { data: contratos }] = await Promise.all([
    supabase.from('mant_extintores').select('id').eq('cliente_id', clienteId),
    supabase.from('mant_tanques').select('id').eq('cliente_id', clienteId),
    supabase.from('contratos').select('id').eq('cliente_id', clienteId),
  ])
  const extIds = (ext || []).map((r: any) => r.id)
  const tanIds = (tan || []).map((r: any) => r.id)
  const contratoIds = (contratos || []).map((r: any) => r.id)

  const storagePaths: string[] = []
  if (extIds.length > 0) {
    const { data } = await supabase.from('mant_documentos').select('storage_path').in('extintor_id', extIds)
    ;(data || []).forEach((d: any) => d.storage_path && storagePaths.push(d.storage_path))
  }
  if (tanIds.length > 0) {
    const { data } = await supabase.from('mant_documentos').select('storage_path').in('tanque_id', tanIds)
    ;(data || []).forEach((d: any) => d.storage_path && storagePaths.push(d.storage_path))
  }
  if (contratoIds.length > 0) {
    const { data } = await supabase.from('contratos_documentos').select('storage_path').in('contrato_id', contratoIds)
    ;(data || []).forEach((d: any) => d.storage_path && storagePaths.push(d.storage_path))
  }
  if (storagePaths.length > 0) {
    await supabase.storage.from('documentos').remove(storagePaths)
  }

  return supabase.from('mant_clientes').delete().eq('id', clienteId)
}
