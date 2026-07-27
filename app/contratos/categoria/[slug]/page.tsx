'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ContratosItemsPage from '@/components/ContratosItemsPage'
import { CategoriaRow } from '@/lib/contratosConfig'

export default function ContratosCategoriaPage() {
  const params = useParams()
  const slug = String(params.slug)
  const supabase = createClient()
  const [categoria, setCategoria] = useState<CategoriaRow | null | undefined>(undefined)

  useEffect(() => {
    supabase.from('contratos_categorias').select('id, slug, label, tipo, orden').eq('slug', slug).maybeSingle().then(({ data }) => {
      setCategoria(data || null)
    })
  }, [slug])

  if (categoria === undefined) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
        Cargando...
      </div>
    )
  }
  if (!categoria) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Esta categoría no existe</div>
        <div style={{ fontSize: 12 }}>Puede que se haya eliminado desde Configuración</div>
      </div>
    )
  }
  return <ContratosItemsPage categoria={categoria.slug} titulo={categoria.label} tipo={categoria.tipo} />
}
