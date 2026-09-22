import { SupabaseClient } from '@supabase/supabase-js'
import { fetchObrasCompletas, type ObraCompleta } from '@/lib/obrasData'
import { hoyLocal, addDias, TIPOS_OBRA, formatMonto, formatPeriodo, redondear } from '@/lib/obrasConfig'

// ── Herramientas del asistente de Obras (formato Anthropic tool use) ─────────
export const ASISTENTE_OBRAS_TOOLS = [
  {
    name: 'buscar_obras',
    description: 'Busca obras por texto libre (nombre de la obra, edificio o empresa) y/o estado. Devuelve un resumen de cada una: pagos, saldo, próximo pago, leyes sociales vs tope, garantía y cierre BPS. Usala primero para identificar la obra (y su id) antes de pedir detalle.',
    input_schema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Parte del nombre del edificio, de la obra o de la empresa. Vacío = todas.' },
        estado: { type: 'string', description: 'Opcional: "Presupuestada", "Contratada", "En ejecución", "Finalizada", "Cancelada", o "en_curso" para Contratada + En ejecución.' },
      },
    },
  },
  {
    name: 'detalle_obra',
    description: 'Devuelve todo sobre una obra puntual: datos del contrato y régimen BPS, plan de pagos completo (pagado/pendiente/atrasado), leyes sociales mes a mes con el cálculo del tope, garantía y estado del cierre en BPS.',
    input_schema: { type: 'object', properties: { obra_id: { type: 'string' } }, required: ['obra_id'] },
  },
  {
    name: 'pagos_obras',
    description: 'Lista pagos a empresas pendientes con fecha prevista dentro de un rango (ej: este mes), más los que están atrasados. Sirve para "¿qué cuotas de obras hay que pagar esta semana/este mes?".',
    input_schema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'YYYY-MM-DD' },
        hasta: { type: 'string', description: 'YYYY-MM-DD' },
        incluir_atrasados: { type: 'boolean', description: 'Por defecto true' },
      },
      required: ['desde', 'hasta'],
    },
  },
  {
    name: 'leyes_sociales',
    description: 'Estado de las leyes sociales contra el tope del contrato. Si se pasa obra_id da el detalle de esa obra; si no, lista las obras con tope y cuánto llevan (marcando las que están cerca o pasadas del tope).',
    input_schema: { type: 'object', properties: { obra_id: { type: 'string' }, solo_alertas: { type: 'boolean' } } },
  },
  {
    name: 'garantias',
    description: 'Lista obras terminadas y su garantía post-obra (hasta cuándo cubre). Con "dias" filtra las que vencen dentro de esa cantidad de días.',
    input_schema: { type: 'object', properties: { dias: { type: 'integer' } } },
  },
  {
    name: 'cierres_bps_pendientes',
    description: 'Obras terminadas a las que les falta el cierre de obra en BPS (ex formulario F9), con el plazo de 30 días corridos y quién lo tiene que hacer.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'resumen_obras',
    description: 'Resumen general del módulo: obras en curso, pagos atrasados, próximos pagos a 30 días, saldo pendiente por moneda, leyes cerca del tope, cierres BPS pendientes y garantías por vencer.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'documentos_obra',
    description: 'Busca los documentos adjuntos (contrato, facturas, planos, constancia de cierre, etc.) de una obra para que el usuario los pueda abrir. Pasar obra_id, o texto para buscar la obra.',
    input_schema: { type: 'object', properties: { obra_id: { type: 'string' }, texto: { type: 'string' }, tipo: { type: 'string', description: 'Opcional: filtrar por tipo, ej "Contrato", "Factura".' } } },
  },
  {
    name: 'comentarios_obra',
    description: 'Devuelve la bitácora de comentarios/novedades de una obra, de la más reciente a la más vieja.',
    input_schema: { type: 'object', properties: { obra_id: { type: 'string' } }, required: ['obra_id'] },
  },
  {
    name: 'registrar_pago_obra',
    description: 'ACCIÓN: marca como pagado un pago del plan de una obra. Requiere el pago_id exacto (sacalo de detalle_obra). Antes de ejecutarla confirmá con el usuario qué obra, qué pago y el monto.',
    input_schema: {
      type: 'object',
      properties: { pago_id: { type: 'string' }, fecha: { type: 'string', description: 'YYYY-MM-DD; si no se indica, hoy' }, comprobante: { type: 'string' } },
      required: ['pago_id'],
    },
  },
  {
    name: 'cargar_leyes_sociales',
    description: 'ACCIÓN: registra la factura de leyes sociales (en pesos) de un mes para una obra. Antes de ejecutarla confirmá con el usuario obra, mes y monto. Después contale cómo queda contra el tope.',
    input_schema: {
      type: 'object',
      properties: {
        obra_id: { type: 'string' },
        mes: { type: 'string', description: 'YYYY-MM' },
        monto: { type: 'number' },
        pagado: { type: 'boolean' },
        comprobante: { type: 'string' },
        forzar: { type: 'boolean', description: 'Solo si el usuario confirmó que quiere cargar una segunda factura para un mes que ya tiene leyes cargadas.' },
      },
      required: ['obra_id', 'mes', 'monto'],
    },
  },
]

function normalizar(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

function resumenCorto(o: ObraCompleta) {
  const prox = o.rp.proximoPago
  return {
    obra_id: o.id,
    edificio: o.edificio,
    obra: o.titulo,
    empresa: o.empresa,
    estado: o.estado,
    situacion: o.situacion.label,
    tipo_obra: TIPOS_OBRA.find(t => t.value === o.tipo_obra)?.label,
    moneda: o.moneda,
    precio_total: o.precio_total,
    pagado: o.rp.totalPagado,
    saldo: o.rp.saldo,
    porcentaje_pagado: Math.round(o.rp.pctPagado * 100),
    pagos_atrasados: o.rp.vencidos.map(p => ({ concepto: p.concepto, monto: p.monto, fecha_prevista: p.fecha_prevista })),
    proximo_pago: prox ? { concepto: prox.concepto, monto: prox.monto, fecha_prevista: prox.fecha_prevista, condicion: prox.condicion } : null,
    leyes: { facturado_pesos: o.rl.totalFacturado, tope_pesos: o.rl.tope, excedente_pesos: o.rl.excedente, porcentaje_tope: o.rl.pctTope != null ? Math.round(o.rl.pctTope * 100) : null, alerta: o.rl.alerta },
    avance_obra: o.avance,
    fecha_inicio: o.fecha_inicio,
    fin_previsto: o.fecha_fin_prevista,
    fin_real: o.fecha_fin_real,
    garantia: o.garantia.estado === 'sin_fin' ? 'obra sin terminar' : { hasta: o.garantia.hasta, dias_restantes: o.garantia.dias, estado: o.garantia.estado },
    cierre_bps: { estado: o.cierre_bps_estado, plazo: o.cierre.limite, vencido: o.cierre.vencido, lo_hace: o.cierre.responsable },
  }
}

async function auditar(supabase: SupabaseClient, usuario: { id: string; email?: string }, fila: { accion: string; tabla: string; registro_id?: string | null; descripcion: string; datos_antes?: any; datos_despues?: any }) {
  await supabase.from('audit_log').insert([{ usuario_id: usuario.id, usuario_email: usuario.email, ...fila }])
}

export async function ejecutarHerramientaObras(supabase: SupabaseClient, usuario: { id: string; email: string | undefined }, nombre: string, input: any): Promise<any> {
  const hoy = hoyLocal()

  switch (nombre) {
    case 'buscar_obras': {
      let obras = await fetchObrasCompletas(supabase)
      if (input.estado === 'en_curso') obras = obras.filter(o => o.estado === 'Contratada' || o.estado === 'En ejecución')
      else if (input.estado) obras = obras.filter(o => o.estado.toLowerCase() === String(input.estado).toLowerCase())
      if (input.texto) {
        const q = normalizar(input.texto)
        obras = obras.filter(o => normalizar(`${o.edificio} ${o.titulo} ${o.empresa || ''}`).includes(q) || normalizar(o.edificio).includes(q) || normalizar(o.titulo).includes(q) || normalizar(o.empresa || '').includes(q))
      }
      return { total: obras.length, obras: obras.slice(0, 25).map(resumenCorto) }
    }

    case 'detalle_obra': {
      const [o] = await fetchObrasCompletas(supabase, { obraId: input.obra_id })
      if (!o) return { error: 'No encontré esa obra' }
      return {
        ...resumenCorto(o),
        descripcion: o.descripcion,
        titular_bps: o.tipo_obra === 'menor_cuantia' || o.titular_bps === 'empresa' ? 'empresa' : 'edificio',
        nro_obra_bps: o.nro_obra_bps,
        fecha_contrato: o.fecha_contrato,
        garantia_meses: o.garantia_meses,
        nota: o.nota,
        plan_de_pagos: [...o.pagos].sort((a, b) => a.orden - b.orden).map(p => ({
          pago_id: p.id, concepto: p.concepto, tipo: p.tipo, monto: p.monto, fecha_prevista: p.fecha_prevista, condicion: p.condicion,
          pagado: p.pagado, fecha_pago: p.fecha_pago, comprobante: p.comprobante,
          atrasado: !p.pagado && !!p.fecha_prevista && p.fecha_prevista < hoy,
        })),
        diferencia_plan_vs_precio: o.rp.diferenciaPlan,
        leyes_por_mes: o.rl.detalle.map(l => ({ periodo: formatPeriodo(l.periodo), facturado: l.monto, acumulado: l.acumulado, a_cargo_edificio: l.aCargoEdificio, excedente: l.excedente, pagado: l.pagado })),
      }
    }

    case 'pagos_obras': {
      const obras = (await fetchObrasCompletas(supabase)).filter(o => o.estado !== 'Cancelada')
      const incluirAtrasados = input.incluir_atrasados !== false
      const filas: any[] = []
      for (const o of obras) {
        for (const p of o.pagos) {
          if (p.pagado || !p.fecha_prevista) continue
          const enRango = p.fecha_prevista >= input.desde && p.fecha_prevista <= input.hasta
          const atrasado = p.fecha_prevista < hoy
          if (enRango || (incluirAtrasados && atrasado)) {
            filas.push({ edificio: o.edificio, obra: o.titulo, obra_id: o.id, empresa: o.empresa, pago_id: p.id, concepto: p.concepto, monto: p.monto, moneda: o.moneda, fecha_prevista: p.fecha_prevista, atrasado })
          }
        }
      }
      filas.sort((a, b) => (a.fecha_prevista < b.fecha_prevista ? -1 : 1))
      const total = (m: string) => redondear(filas.filter(f => f.moneda === m).reduce((s, f) => s + f.monto, 0))
      return { total_pagos: filas.length, total_pesos: total('UYU'), total_dolares: total('USD'), pagos: filas }
    }

    case 'leyes_sociales': {
      if (input.obra_id) {
        const [o] = await fetchObrasCompletas(supabase, { obraId: input.obra_id })
        if (!o) return { error: 'No encontré esa obra' }
        return {
          edificio: o.edificio, obra: o.titulo, tope_pesos: o.rl.tope, facturado: o.rl.totalFacturado, a_cargo_edificio: o.rl.totalACargoEdificio,
          excedente_a_cargo_empresa: o.rl.excedente, disponible: o.rl.disponible, porcentaje_tope: o.rl.pctTope != null ? Math.round(o.rl.pctTope * 100) : null,
          pendiente_de_pago: o.rl.pendientePago, alerta: o.rl.alerta,
          meses: o.rl.detalle.map(l => ({ periodo: formatPeriodo(l.periodo), facturado: l.monto, acumulado: l.acumulado, excedente: l.excedente, pagado: l.pagado })),
        }
      }
      let obras = (await fetchObrasCompletas(supabase)).filter(o => o.estado !== 'Cancelada' && (o.rl.tope != null || o.rl.totalFacturado > 0))
      if (input.solo_alertas) obras = obras.filter(o => o.rl.alerta === 'cerca' || o.rl.alerta === 'excedido')
      return {
        total: obras.length,
        obras: obras.map(o => ({ obra_id: o.id, edificio: o.edificio, obra: o.titulo, tope: o.rl.tope, facturado: o.rl.totalFacturado, excedente: o.rl.excedente, porcentaje_tope: o.rl.pctTope != null ? Math.round(o.rl.pctTope * 100) : null, alerta: o.rl.alerta })),
      }
    }

    case 'garantias': {
      let obras = (await fetchObrasCompletas(supabase)).filter(o => o.estado !== 'Cancelada' && o.garantia.estado !== 'sin_fin')
      if (input.dias) obras = obras.filter(o => o.garantia.estado === 'en_garantia' && (o.garantia.dias ?? 0) <= input.dias)
      obras.sort((a, b) => (a.garantia.hasta! < b.garantia.hasta! ? -1 : 1))
      return { total: obras.length, obras: obras.map(o => ({ obra_id: o.id, edificio: o.edificio, obra: o.titulo, empresa: o.empresa, fin_real: o.fecha_fin_real, garantia_meses: o.garantia_meses, garantia_hasta: o.garantia.hasta, dias_restantes: o.garantia.dias, estado: o.garantia.estado })) }
    }

    case 'cierres_bps_pendientes': {
      const obras = (await fetchObrasCompletas(supabase)).filter(o => o.estado !== 'Cancelada' && o.cierre.pendiente)
      return {
        total: obras.length,
        nota: 'El cierre (comunicar el fin de obra) se hace en línea en BPS dentro de los 30 días corridos del fin de los trabajos; el formulario F9 quedó solo para obras de más de 5 años.',
        obras: obras.map(o => ({ obra_id: o.id, edificio: o.edificio, obra: o.titulo, empresa: o.empresa, fin_real: o.fecha_fin_real, plazo: o.cierre.limite, dias_restantes: o.cierre.dias, vencido: o.cierre.vencido, lo_tiene_que_hacer: o.cierre.responsable === 'empresa' ? 'la empresa (obra a su nombre)' : 'el edificio / la administración' })),
      }
    }

    case 'resumen_obras': {
      const obras = (await fetchObrasCompletas(supabase)).filter(o => o.estado !== 'Cancelada')
      const enCurso = obras.filter(o => o.estado === 'Contratada' || o.estado === 'En ejecución')
      const en30 = addDias(hoy, 30)
      const prox = obras.flatMap(o => o.pagos.filter(p => !p.pagado && p.fecha_prevista && p.fecha_prevista >= hoy && p.fecha_prevista <= en30).map(p => ({ ...p, moneda: o.moneda })))
      const saldo = (m: string) => redondear(enCurso.filter(o => o.moneda === m).reduce((s, o) => s + Math.max(0, o.rp.saldo), 0))
      return {
        total_obras: obras.length,
        en_curso: enCurso.length,
        presupuestadas: obras.filter(o => o.estado === 'Presupuestada').length,
        pagos_atrasados: obras.reduce((s, o) => s + o.rp.vencidos.length, 0),
        pagos_proximos_30_dias: { cantidad: prox.length, pesos: redondear(prox.filter(p => p.moneda === 'UYU').reduce((s, p) => s + p.monto, 0)), dolares: redondear(prox.filter(p => p.moneda === 'USD').reduce((s, p) => s + p.monto, 0)) },
        saldo_obras_en_curso: { pesos: saldo('UYU'), dolares: saldo('USD') },
        leyes_cerca_o_pasadas_del_tope: obras.filter(o => o.rl.alerta === 'cerca' || o.rl.alerta === 'excedido').length,
        cierres_bps_pendientes: obras.filter(o => o.cierre.pendiente).length,
        garantias_por_vencer_60_dias: obras.filter(o => o.garantia.porVencer).length,
      }
    }

    case 'documentos_obra': {
      let obras: ObraCompleta[] = []
      if (input.obra_id) obras = await fetchObrasCompletas(supabase, { obraId: input.obra_id })
      else if (input.texto) {
        const q = normalizar(input.texto)
        obras = (await fetchObrasCompletas(supabase)).filter(o => normalizar(`${o.edificio} ${o.titulo} ${o.empresa || ''}`).includes(q) || normalizar(o.edificio).includes(q) || normalizar(o.titulo).includes(q))
      }
      if (obras.length === 0) return { total: 0, detalle: [] }
      const ids = obras.slice(0, 10).map(o => o.id)
      let q = supabase.from('obras_documentos').select('id, obra_id, nombre, tipo, storage_path, created_at').in('obra_id', ids).order('created_at', { ascending: false })
      if (input.tipo) q = q.ilike('tipo', `%${input.tipo}%`)
      const { data, error } = await q
      if (error) return { error: error.message }
      // Mismo formato que usa el chat de Seguros para mostrar botones de "abrir documento"
      const detalle = obras.slice(0, 10).map(o => ({ cliente: `${o.edificio} · ${o.titulo}`, cliente_id: o.id, documentos: (data || []).filter((d: any) => d.obra_id === o.id) }))
      return { total: (data || []).length, detalle }
    }

    case 'comentarios_obra': {
      const { data, error } = await supabase.from('obras_comentarios').select('fecha, texto').eq('obra_id', input.obra_id).order('fecha', { ascending: false }).limit(30)
      if (error) return { error: error.message }
      return { total: data?.length || 0, comentarios: data }
    }

    case 'registrar_pago_obra': {
      const { data: antes, error: e1 } = await supabase.from('obras_pagos').select('*, obras(titulo, moneda, mant_clientes(nombre))').eq('id', input.pago_id).maybeSingle()
      if (e1 || !antes) return { error: 'No encontré ese pago' }
      if (antes.pagado) return { error: `Ese pago ya figura como pagado el ${antes.fecha_pago}` }
      const cambios = { pagado: true, fecha_pago: input.fecha || hoy, comprobante: input.comprobante || antes.comprobante || null }
      const { error } = await supabase.from('obras_pagos').update(cambios).eq('id', input.pago_id)
      if (error) return { error: error.message }
      const o: any = antes.obras
      await auditar(supabase, usuario, {
        accion: 'editar', tabla: 'obras_pagos', registro_id: input.pago_id,
        descripcion: `Pago registrado vía asistente: ${antes.concepto} (${formatMonto(Number(antes.monto), o?.moneda)}) — ${o?.titulo} (${o?.mant_clientes?.nombre})`,
        datos_antes: { pagado: false, fecha_pago: null, comprobante: antes.comprobante }, datos_despues: cambios,
      })
      return { ok: true, pago: { concepto: antes.concepto, monto: Number(antes.monto), moneda: o?.moneda, fecha_pago: cambios.fecha_pago }, obra: o?.titulo, edificio: o?.mant_clientes?.nombre }
    }

    case 'cargar_leyes_sociales': {
      if (!/^\d{4}-\d{2}$/.test(input.mes || '')) return { error: 'El mes tiene que venir como YYYY-MM' }
      const monto = Number(input.monto)
      if (!isFinite(monto) || monto <= 0) return { error: 'Monto inválido' }
      const { data: yaCargadas } = await supabase.from('obras_leyes').select('id, monto').eq('obra_id', input.obra_id).eq('periodo', `${input.mes}-01`)
      if ((yaCargadas || []).length > 0 && !input.forzar) {
        return { error: 'Ya hay leyes sociales cargadas para ese mes en esta obra', ya_cargado: (yaCargadas || []).map((l: any) => ({ monto: Number(l.monto) })), sugerencia: 'Preguntale al usuario si es una factura adicional (y en ese caso volvé a llamar con forzar: true) o si ya estaba cargada.' }
      }
      const fila = { obra_id: input.obra_id, periodo: `${input.mes}-01`, monto, pagado: !!input.pagado, fecha_pago: input.pagado ? hoy : null, comprobante: input.comprobante || null }
      const { data, error } = await supabase.from('obras_leyes').insert([fila]).select().single()
      if (error) return { error: error.message }
      const [o] = await fetchObrasCompletas(supabase, { obraId: input.obra_id })
      await auditar(supabase, usuario, { accion: 'crear', tabla: 'obras_leyes', registro_id: data?.id, descripcion: `Leyes sociales ${formatPeriodo(fila.periodo)} cargadas vía asistente: ${formatMonto(monto)} — ${o?.titulo} (${o?.edificio})`, datos_despues: data })
      return { ok: true, cargado: { mes: formatPeriodo(fila.periodo), monto }, como_queda: o ? { facturado: o.rl.totalFacturado, tope: o.rl.tope, excedente: o.rl.excedente, porcentaje_tope: o.rl.pctTope != null ? Math.round(o.rl.pctTope * 100) : null } : null }
    }

    default:
      return { error: `Herramienta desconocida: ${nombre}` }
  }
}
