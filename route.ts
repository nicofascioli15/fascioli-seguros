import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json()
    if (!userId || !password || password.length < 6) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is superadmin
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: userData } = await supabaseAdmin.from('usuarios').select('rol').eq('id', user.id).single()
    if (userData?.rol !== 'superadmin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    // Use Supabase Management API directly
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        body: JSON.stringify({ password }),
      }
    )

    const result = await res.json()
    if (!res.ok) {
      console.error('Supabase error:', result)
      return NextResponse.json({ error: result.message || 'Error al cambiar contraseña' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Server error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
