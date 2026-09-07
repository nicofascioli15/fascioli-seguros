import { SupabaseClient } from '@supabase/supabase-js'

// ── Definición de herramientas (formato Anthropic tool use) ─────────────────
export const ASISTENTE_TOOLS = [
  {
    name: 'buscar_vencimientos',
    description: 'Busca pólizas cuyo vencimiento cae dentro de un rango de fechas. Usar para preguntas como "qué pólizas vencen esta semana/este mes/este año".',
    input_schema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Fecha desde, formato YYYY-MM-DD' },
        hasta: { type: 'string', description: 'Fecha hasta, formato YYYY-MM-DD' },
      },
      required: ['desde', 'hasta'],
    },
  },
  {
    name: 'buscar_cliente',
    description: 'Busca clientes por nombre (coincidencia parcial) y devuelve sus pólizas.',
    input_schema: {
      type: 'object',
      properties: { nombre: { type: 'string', description: 'Nombre o parte del nombre del cliente/edificio' } },
      required: ['nombre'],
    },
  },
  {
    name: 'cuotas_pendientes_cliente',
    description: 'Devuelve las cuotas sin pagar de las pólizas de un cliente.',
    input_schema: {
      type: 'object',
      properties: { nombre_cliente: { type: 'string' } },
      required: ['nombre_cliente'],
    },
  },
  {
    name: 'buscar_siniestros',
    description: 'Lista siniestros, opcionalmente filtrados por cliente y/o estado.',
    input_schema: {
      type: 'object',
      properties: {
        nombre_cliente: { type: 'string' },
        estado: { type: 'string', description: 'Ej: "En gestión", "Resuelto"' },
      },
    },
  },
  {
    name: 'clientes_sin_documentos',
    description: 'Lista clientes que no tienen ningún documento/adjunto cargado en el sistema.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'resumen_general',
    description: 'Da un resumen general del sistema: total de pólizas activas, cuántas vencen este mes, siniestros abiertos, total de clientes.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'buscar_poliza',
    description: 'Busca una póliza puntual por número, o por cliente + ramo, para obtener su id exacto antes de hacer una acción sobre ella.',
    input_schema: {
      type: 'object',
      properties: {
        numero: { type: 'string' },
        nombre_cliente: { type: 'string' },
        ramo: { type: 'string' },
      },
    },
  },
  {
    name: 'marcar_cuota_pagada',
    description: 'ACCIÓN: registra el pago de una cuota de una póliza. Requiere el id exacto de la póliza (obtenido antes con buscar_poliza) y el número de cuota. Si hay ambigüedad sobre qué póliza o cuota, primero preguntale al usuario en vez de adivinar.',
    input_schema: {
      type: 'object',
      properties: {
        poliza_id: { type: 'string' },
        cuota_num: { type: 'integer' },
        fecha: { type: 'string', description: 'YYYY-MM-DD, si no se especifica se usa la fecha de hoy' },
        metodo: { type: 'string' },
        referencia: { type: 'string' },
      },
      required: ['poliza_id', 'cuota_num'],
    },
  },
]

// ── Helpers de fechas de cuotas (misma lógica que ClienteDetalle.tsx) ───────
const MESES: Record<string, string> = { Ene: '01', Feb: '02', Mar: '03', Abr: '04', May: '05', Jun: '06', Jul: '07', Ago: '08', Sep: '09', Oct: '10', Nov: '11', Dic: '12' }

function parseFechasCuotaMes(cuotaMes: string): string[] {
  if (!cuotaMes) return []
  return cuotaMes.split(' - ').map(item => {
    const parts = item.split('/')
    if (parts.length < 4) return ''
    const d = parts[1].padStart(2, '0'), m = MESES[parts[2]] || '01', y = `20${parts[3]}`
    return `${y}-${m}-${d}`
  })
}

// ── Ejecutor ──────────────────────────────────────────────────────────────
export async function ejecutarHerramienta(
  supabase: SupabaseClient,
  usuario: { id: string; email: string | undefined },
  nombre: string,
  input: any
): Promise<any> {
  const hoy = new Date().toISOString().slice(0, 10)

  switch (nombre) {
    case 'buscar_vencimientos': {
      const { data, error } = await supabase
        .from('polizas')
        .select('id, numero, ramo, compania, vencimiento, cliente:clientes(nombre)')
        .gte('vencimiento', input.desde)
        .lte('vencimiento', input.hasta)
        .order('vencimiento', { ascending: true })
        .limit(60)
      if (error) return { error: error.message }
      return { total: data?.length || 0, polizas: data }
    }

    case 'buscar_cliente': {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, direccion, tel, email, polizas(id, numero, ramo, compania, vencimiento)')
        .ilike('nombre', `%${input.nombre}%`)
        .limit(15)
      if (error) return { error: error.message }
      return { total: data?.length || 0, clientes: data }
    }

    case 'cuotas_pendientes_cliente': {
      const { data: clientes } = await supabase.from('clientes').select('id, nombre').ilike('nombre', `%${input.nombre_cliente}%`).limit(5)
      if (!clientes || clientes.length === 0) return { error: 'No se encontró ningún cliente con ese nombre' }

      const resultado: any[] = []
      for (const cli of clientes) {
        const { data: polizas } = await supabase.from('polizas').select('id, numero, ramo, cuotas, cuota_mes').eq('cliente_id', cli.id).gt('cuotas', 0)
        for (const pol of polizas || []) {
          const { data: pagos } = await supabase.from('pagos').select('cuota_num').eq('poliza_id', pol.id)
          const pagadas = new Set((pagos || []).map(p => p.cuota_num))
          const fechas = parseFechasCuotaMes(pol.cuota_mes || '')
          const pendientes = []
          for (let n = 1; n <= pol.cuotas; n++) {
            if (!pagadas.has(n)) pendientes.push({ cuota_num: n, fecha_prevista: fechas[n - 1] || null })
          }
          if (pendientes.length > 0) resultado.push({ cliente: cli.nombre, poliza_id: pol.id, numero: pol.numero, ramo: pol.ramo, cuotas_pendientes: pendientes })
        }
      }
      return { total_polizas_con_pendientes: resultado.length, detalle: resultado }
    }

    case 'buscar_siniestros': {
      let q = supabase.from('siniestros').select('id, tipo, descripcion, fecha_ocurrencia, estado, cliente:clientes(nombre)').order('fecha_ocurrencia', { ascending: false }).limit(30)
      if (input.estado) q = q.eq('estado', input.estado)
      if (input.nombre_cliente) {
        const { data: clientes } = await supabase.from('clientes').select('id').ilike('nombre', `%${input.nombre_cliente}%`)
        const ids = (clientes || []).map(c => c.id)
        if (ids.length === 0) return { total: 0, siniestros: [] }
        q = q.in('cliente_id', ids)
      }
      const { data, error } = await q
      if (error) return { error: error.message }
      return { total: data?.length || 0, siniestros: data }
    }

    case 'clientes_sin_documentos': {
      const { data: clientes } = await supabase.from('clientes').select('id, nombre')
      const { data: docs } = await supabase.from('documentos').select('cliente_id')
      const conDocs = new Set((docs || []).map(d => d.cliente_id))
      const sinDocs = (clientes || []).filter(c => !conDocs.has(c.id)).map(c => c.nombre)
      return { total: sinDocs.length, clientes: sinDocs }
    }

    case 'resumen_general': {
      const primerDiaMes = hoy.slice(0, 8) + '01'
      const [y, m] = hoy.split('-')
      const ultimoDiaMes = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10)
      const [{ count: totalPolizas }, { count: vencenEsteMes }, { count: siniestrosAbiertos }, { count: totalClientes }] = await Promise.all([
        supabase.from('polizas').select('id', { count: 'exact', head: true }).gte('vencimiento', hoy),
        supabase.from('polizas').select('id', { count: 'exact', head: true }).gte('vencimiento', primerDiaMes).lte('vencimiento', ultimoDiaMes),
        supabase.from('siniestros').select('id', { count: 'exact', head: true }).neq('estado', 'Resuelto'),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
      ])
      return { polizas_activas: totalPolizas || 0, vencen_este_mes: vencenEsteMes || 0, siniestros_abiertos: siniestrosAbiertos || 0, total_clientes: totalClientes || 0 }
    }

    case 'buscar_poliza': {
      let q = supabase.from('polizas').select('id, numero, ramo, compania, vencimiento, cuotas, cliente:clientes(id, nombre)').limit(15)
      if (input.numero) q = q.eq('numero', input.numero)
      if (input.ramo) q = q.eq('ramo', input.ramo)
      if (input.nombre_cliente) {
        const { data: clientes } = await supabase.from('clientes').select('id').ilike('nombre', `%${input.nombre_cliente}%`)
        const ids = (clientes || []).map(c => c.id)
        if (ids.length === 0) return { total: 0, polizas: [] }
        q = q.in('cliente_id', ids)
      }
      const { data, error } = await q
      if (error) return { error: error.message }
      return { total: data?.length || 0, polizas: data }
    }

    case 'marcar_cuota_pagada': {
      const { data: pagoData, error } = await supabase.from('pagos').upsert([{
        poliza_id: input.poliza_id,
        cuota_num: input.cuota_num,
        fecha: input.fecha || hoy,
        metodo: input.metodo || null,
        referencia: input.referencia || null,
      }], { onConflict: 'poliza_id,cuota_num' }).select().single()
      if (error) return { error: error.message }

      await supabase.from('audit_log').insert([{
        usuario_id: usuario.id,
        usuario_email: usuario.email,
        accion: 'crear',
        tabla: 'pagos',
        registro_id: pagoData?.id,
        descripcion: `Pago registrado vía asistente: cuota ${input.cuota_num} — póliza ${input.poliza_id}`,
        datos_despues: pagoData,
      }])

      return { ok: true, pago: pagoData }
    }

    default:
      return { error: `Herramienta desconocida: ${nombre}` }
  }
}
