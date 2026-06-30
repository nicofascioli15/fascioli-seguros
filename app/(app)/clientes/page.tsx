'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ClientesList from './ClientesList'
import ClienteDetalle from './ClienteDetalle'

export default function ClientesPage() {
  const [selected, setSelected] = useState<{ id: string; nombre: string } | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId && !selected) {
      supabase.from('clientes').select('id, nombre').eq('id', openId).single().then(({ data }) => {
        if (data) {
          setSelected({ id: data.id, nombre: data.nombre })
          router.replace('/clientes')
        }
      })
    }
  }, [searchParams])

  if (selected) {
    return <ClienteDetalle id={selected.id} nombre={selected.nombre} onBack={() => setSelected(null)} />
  }

  return <ClientesList onSelect={(id, nombre) => setSelected({ id, nombre })} />
}


