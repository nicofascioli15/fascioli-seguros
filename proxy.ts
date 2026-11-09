import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // La tablet de las asambleas (/t/CODIGO) funciona sin usuario: solo puede acreditar y votar
  // en esa asamblea, a través de funciones de la base que controlan el código.
  // Lo mismo para el QR de la sala (/v/CODIGO): votación desde el celular de cada propietario.
  if (request.nextUrl.pathname.startsWith('/t/') || request.nextUrl.pathname.startsWith('/v/')) return response

  // Redirect to login if not authenticated (except login page)
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to dashboard if already logged in on login page
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.svg).*)'],
}

