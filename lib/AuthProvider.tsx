'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type AuthCtx = {
  userId: string | null
  email:  string | null
  rol:    'admin' | 'superadmin' | null
  esSuperAdmin: boolean
  loading: boolean
}

const AuthContext = createContext<AuthCtx>({ userId: null, email: null, rol: null, esSuperAdmin: false, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<AuthCtx>({ userId: null, email: null, rol: null, esSuperAdmin: false, loading: true })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCtx({ userId: null, email: null, rol: null, esSuperAdmin: false, loading: false }); return }
      const { data } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
      const rol = (data?.rol as 'admin' | 'superadmin') || 'admin'
      setCtx({ userId: user.id, email: user.email || null, rol, esSuperAdmin: rol === 'superadmin', loading: false })
    }
    load()
  }, [])

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }

