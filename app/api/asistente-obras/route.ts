import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ASISTENTE_OBRAS_TOOLS, ejecutarHerramientaObras } from '@/lib/asistenteObrasTools'
import { hoyLocal } from '@/lib/obrasConfig'

function systemPrompt() {
  return `Sos el asistente virtual interno del módulo de Obras de Fascioli Administraciones (administración de edificios en propiedad horizontal, Uruguay). Respondés en español rioplatense, corto y directo, como a un compañero de la administradora.

Qué sabés del negocio:
- Cada obra es un trabajo puntual en un edificio (pintura de fachada, rejas, impermeabilización...) contratado con una empresa. Se paga en pesos o dólares según el contrato: entrega inicial, pagos por avance, cuotas y/o pago final.
- Leyes sociales (aportes BPS de la construcción, Ley 14.411): siempre en pesos. Muchos contratos fijan un TOPE máximo que asume el edificio; lo que se facture por encima lo absorbe la empresa (hay que descontárselo de los pagos o reclamárselo).
- Tipos de obra ante BPS: por contrato (empresa), por administración (el edificio contrata al personal) y de menor cuantía (hasta 85 jornales, sin permiso, a nombre del contratista).
- Al terminar la obra hay 30 días corridos para comunicar el cierre de obra en BPS (antes formulario F9; hoy en línea, el F9 queda para obras de más de 5 años). Si la obra está a nombre de la empresa, el cierre lo hace la empresa. Una obra sin cerrar puede trabar certificados en futuras ventas de unidades.
- La garantía post-obra corre desde la fecha de fin real por los meses pactados.

Reglas:
- Usá siempre las herramientas para consultar datos reales. Nunca inventes montos, fechas ni nombres.
- Para hablar de una obra puntual, primero identificala con buscar_obras; si hay varias parecidas, preguntá cuál.
- Las acciones (registrar_pago_obra, cargar_leyes_sociales) solo después de confirmar con el usuario obra, concepto/mes y monto. Después de cargar leyes, contá cómo quedó contra el tope.
- Montos: pesos como "$ 12.500" y dólares como "U$S 3.000". Fechas como DD/MM/AAAA. Hoy es ${hoyLocal()}.
- Respuestas cortas; en lista cuando haya varios resultados. Resumí, no vuelques datos crudos.
- Con documentos_obra no menciones rutas internas de archivos: la interfaz ya muestra un botón para abrir cada documento.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Cliente con el token del usuario: las políticas RLS aplican igual que en la app.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const anthropicMessages: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }))
    const acciones: any[] = []
    const documentos: any[] = []
    const system = systemPrompt()

    for (let vuelta = 0; vuelta < 8; vuelta++) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1800, system, messages: anthropicMessages, tools: ASISTENTE_OBRAS_TOOLS }),
      })

      if (!resp.ok) {
        console.error('Anthropic API error (obras):', await resp.text())
        return NextResponse.json({ error: 'Error consultando al asistente' }, { status: 502 })
      }

      const data = await resp.json()
      anthropicMessages.push({ role: 'assistant', content: data.content })

      if (data.stop_reason !== 'tool_use') {
        const texto = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        return NextResponse.json({ respuesta: texto, acciones, documentos })
      }

      const toolResults = []
      for (const block of data.content) {
        if (block.type !== 'tool_use') continue
        let resultado: any
        try {
          resultado = await ejecutarHerramientaObras(supabase, { id: user.id, email: user.email }, block.name, block.input || {})
        } catch (e: any) {
          resultado = { error: e?.message || 'Error ejecutando la consulta' }
        }

        let paraModelo = resultado
        if (block.name === 'documentos_obra' && resultado?.detalle) {
          for (const grupo of resultado.detalle) if (grupo.documentos?.length > 0) documentos.push(grupo)
          // Al modelo no le mandamos la ruta interna del archivo (la interfaz ya muestra el botón para abrirlo).
          paraModelo = { ...resultado, detalle: resultado.detalle.map((g: any) => ({ ...g, documentos: (g.documentos || []).map((d: any) => ({ id: d.id, nombre: d.nombre, tipo: d.tipo, created_at: d.created_at })) })) }
        }
        if ((block.name === 'registrar_pago_obra' || block.name === 'cargar_leyes_sociales') && resultado?.ok) acciones.push({ herramienta: block.name, input: block.input, resultado })

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(paraModelo) })
      }
      anthropicMessages.push({ role: 'user', content: toolResults })
    }

    return NextResponse.json({ error: 'El asistente hizo demasiadas consultas intermedias sin responder' }, { status: 500 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
