import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useRol() {
  const [rol, setRol]       = useState<'admin' | 'superadmin' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRol() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()
      setRol((data?.rol as 'admin' | 'superadmin') || 'admin')
      setLoading(false)
    }
    fetchRol()
  }, [])

  return { rol, loading, esSuperAdmin: rol === 'superadmin' }
}

