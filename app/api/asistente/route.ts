import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ASISTENTE_TOOLS, ejecutarHerramienta } from '@/lib/asistenteTools'

const SYSTEM_PROMPT = `Sos el asistente virtual interno de Fascioli Seguros. Respondés en español rioplatense, corto y directo, como si le hablaras a un empleado de la administradora.

Reglas:
- Usá las herramientas disponibles para consultar datos reales, nunca inventes números, fechas ni nombres.
- Si una pregunta es ambigua (por ejemplo, hay varios clientes con nombres parecidos), preguntá antes de asumir.
- Antes de ejecutar marcar_cuota_pagada, asegurate de tener el poliza_id correcto (buscalo con buscar_poliza si no lo tenés) y confirmá con el usuario los datos si hubo alguna ambigüedad.
- Las fechas en la base están en formato YYYY-MM-DD. Hoy es ${new Date().toISOString().slice(0, 10)}.
- Respuestas cortas, en formato de lista cuando haya varios resultados. No repitas toda la data cruda, resumila.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Cliente con el token del usuario logueado, para que las políticas RLS
    // apliquen igual que en el resto de la app (el asistente no tiene más
    // permisos que el usuario que lo está usando).
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const anthropicMessages = messages.map((m: any) => ({ role: m.role, content: m.content }))
    const accionesEjecutadas: any[] = []

    let vueltas = 0
    while (vueltas < 6) {
      vueltas++
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: anthropicMessages,
          tools: ASISTENTE_TOOLS,
        }),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        console.error('Anthropic API error:', errText)
        return NextResponse.json({ error: 'Error consultando al asistente' }, { status: 502 })
      }

      const data = await resp.json()
      anthropicMessages.push({ role: 'assistant', content: data.content })

      if (data.stop_reason !== 'tool_use') {
        const textoFinal = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        return NextResponse.json({ respuesta: textoFinal, acciones: accionesEjecutadas })
      }

      const toolResults = []
      for (const block of data.content) {
        if (block.type !== 'tool_use') continue
        const resultado = await ejecutarHerramienta(supabase, { id: user.id, email: user.email }, block.name, block.input)
        if (block.name === 'marcar_cuota_pagada' && resultado?.ok) accionesEjecutadas.push({ herramienta: block.name, input: block.input, resultado })
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(resultado) })
      }
      anthropicMessages.push({ role: 'user', content: toolResults })
    }

    return NextResponse.json({ error: 'El asistente hizo demasiadas consultas intermedias sin responder' }, { status: 500 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
