// Pólizas de renovación automática mensual (ej. Accidentes de trabajo — BSE/BPS):
// no hace falta marcar manualmente "Pagado" cada mes. Una vez que pasa la fecha de
// vencimiento del período, se asume pagado, se genera el próximo período pendiente
// y se avanza el vencimiento de la póliza un mes. Esta función hace ese "barrido" y
// se llama desde las pantallas que muestran vencimientos (Dashboard, Vencimientos,
// Pólizas) para que quede al día sin importar por dónde entre el usuario.

function primerDiaMes(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}-01`
}

function sumarUnMes(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const targetMonthRaw = m - 1 + 1
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`
}

export async function reconciliarControlesMensuales(supabase: any) {
  const hoy = new Date().toISOString().slice(0, 10)
  const { data: polizas } = await supabase
    .from('polizas')
    .select('id, vencimiento')
    .eq('renovacion_mensual', true)
    .lt('vencimiento', hoy)
  if (!polizas || polizas.length === 0) return

  for (const pol of polizas) {
    let vencimientoActual: string | null = pol.vencimiento
    let guard = 0
    while (vencimientoActual && vencimientoActual < hoy && guard < 24) {
      guard++
      const periodoActual = primerDiaMes(vencimientoActual)
      let { data: control } = await supabase
        .from('poliza_controles_mensuales')
        .select('id, estado')
        .eq('poliza_id', pol.id).eq('periodo', periodoActual).maybeSingle()
      if (!control) {
        const { data: nuevo } = await supabase
          .from('poliza_controles_mensuales')
          .insert([{ poliza_id: pol.id, periodo: periodoActual, estado: 'pendiente' }])
          .select().single()
        control = nuevo
      }
      if (control && control.estado !== 'pagado') {
        await supabase.from('poliza_controles_mensuales').update({
          estado: 'pagado', fecha_pago: hoy,
        }).eq('id', control.id)
      }
      const proximoPeriodo = sumarUnMes(periodoActual)
      await supabase.from('polizas').update({ vencimiento: proximoPeriodo }).eq('id', pol.id)
      const { data: existe } = await supabase.from('poliza_controles_mensuales')
        .select('id').eq('poliza_id', pol.id).eq('periodo', proximoPeriodo).maybeSingle()
      if (!existe) {
        await supabase.from('poliza_controles_mensuales')
          .insert([{ poliza_id: pol.id, periodo: proximoPeriodo, estado: 'pendiente' }])
      }
      vencimientoActual = proximoPeriodo
    }
  }
}
