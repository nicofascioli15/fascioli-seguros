import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Login del lado del servidor: lo usa el formulario cuando el navegador no corre el JavaScript
// de la página (por ejemplo iPads con iOS viejo). Inicia sesión, deja la cookie y redirige.
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const email = String(form.get('email') || '').trim()
  const password = String(form.get('password') || '')

  const ok = NextResponse.redirect(new URL('/hub', req.url), 303)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookies) { cookies.forEach(({ name, value, options }) => ok.cookies.set(name, value, options)) },
      },
    }
  )

  if (!email || !password) return NextResponse.redirect(new URL('/login?error=1', req.url), 303)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.redirect(new URL('/login?error=1', req.url), 303)
  return ok
}
