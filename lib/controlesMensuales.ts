// Pólizas de renovación automática mensual (ej. Accidentes de trabajo — BSE/BPS):
// no hace falta marcar manualmente "Pagado" cada mes. El pasaje a Pagada es automático:
// pasada la fecha de vencimiento del período, se marca Pagada el día 5 del mes SIGUIENTE
// a ese vencimiento (no en el momento mismo del vencimiento), se genera el próximo
// período (vencimiento = vencimiento anterior + 1 mes) en estado Pendiente, y así
// sucesivamente hacia adelante.
// Esta función hace ese "barrido" y se llama desde las pantallas que muestran
// vencimientos (Dashboard, Vencimientos, Pólizas) para que quede al día sin importar
// por dónde entre el usuario.

const DIA_CORTE = 5

function primerDiaMes(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}-01`
}

// Suma N meses a una fecha, conservando el día del mes (clampeado al último día
// del mes destino si hace falta, ej. 31 de enero + 1 mes -> 28/29 de febrero).
function addMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const targetMonthRaw = m - 1 + meses
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(d, maxDay)).padStart(2, '0')}`
}

// Fecha de corte de un vencimiento: día 5 del mes siguiente al mes del vencimiento.
function fechaCorte(vencimiento: string): string {
  const [y, m] = vencimiento.split('-').map(Number)
  const targetMonthRaw = m - 1 + 1
  const targetYear = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(DIA_CORTE).padStart(2, '0')}`
}

export async function reconciliarControlesMensuales(supabase: any) {
  const hoyISO = new Date().toISOString().slice(0, 10)

  const { data: polizas } = await supabase
    .from('polizas')
    .select('id, vencimiento')
    .eq('renovacion_mensual', true)
  if (!polizas || polizas.length === 0) return

  for (const pol of polizas) {
    let vencimientoActual: string | null = pol.vencimiento
    let guard = 0
    while (vencimientoActual && guard < 36) {
      const corte = fechaCorte(vencimientoActual)
      if (hoyISO < corte) break // todavía no llegó el día 5 del mes siguiente a este vencimiento
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
          estado: 'pagado', fecha_pago: corte,
        }).eq('id', control.id)
      }

      const proximoVencimiento = addMeses(vencimientoActual, 1)
      await supabase.from('polizas').update({ vencimiento: proximoVencimiento }).eq('id', pol.id)
      const proximoPeriodo = primerDiaMes(proximoVencimiento)
      const { data: existe } = await supabase.from('poliza_controles_mensuales')
        .select('id').eq('poliza_id', pol.id).eq('periodo', proximoPeriodo).maybeSingle()
      if (!existe) {
        await supabase.from('poliza_controles_mensuales')
          .insert([{ poliza_id: pol.id, periodo: proximoPeriodo, estado: 'pendiente' }])
      }
      vencimientoActual = proximoVencimiento
    }
  }
}
