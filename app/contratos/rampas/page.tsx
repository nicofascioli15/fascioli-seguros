'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Ruta vieja — las categorías ahora son dinámicas y viven en /contratos/categoria/[slug]
export default function RampasRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/contratos/categoria/rampa') }, [])
  return null
}
