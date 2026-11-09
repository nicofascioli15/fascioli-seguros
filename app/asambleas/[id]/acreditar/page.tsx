'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// La tablet ahora entra sin usuario por /t/CODIGO. Este link viejo redirige allá.
export default function RedirigirTablet() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  useEffect(() => {
    createClient().from('asambleas').select('codigo_tablet').eq('id', id).maybeSingle()
      .then(({ data }: any) => router.replace(data?.codigo_tablet ? `/t/${data.codigo_tablet}` : `/asambleas/${id}`))
  }, [id])
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Abriendo la tablet...</div>
}
