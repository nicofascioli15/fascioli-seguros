'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Building2, ArrowUpDown, Accessibility, FileCog, HardHat, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fetchCategorias, CategoriaRow, calcularAuto, calcularObra, hoyISO } from '@/lib/contratosConfig'

type Contrato = {
  id: string
  categoria: string
  cliente_id: string | null
  fecha_firma_inicio: string | null
  vigencia_anios: number | null
  fecha_fin: string | null
  garantia_meses: number | null
  mant_clientes: { nombre: string } | null
}

const ICONOS_CONOCIDOS: Record<string, any> = { ascensor: ArrowUpDown, rampa: Accessibility, servicio: FileCog, obra: HardHat }

export default function ContratosDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [edificios, setEdificios] = useState(0)
  const [porVencer, setPorVencer] = useState(0)
  const [seguimiento, setSeguimiento] = useState(0)
  const [vigentes, setVigentes] = useState(0)
  const [categorias, setCategorias] = useState<CategoriaRow[]>([])
  const [porCategoria, setPorCategoria] = useState<Record<string, number>>({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const hoy = hoyISO()
    const [{ count: edifCount }, cats, { data: contratosData }] = await Promise.all([
      supabase.from('mant_clientes').select('*', { count: 'exact', head: true }),
      fetchCategorias(supabase),
      supabase.from('contratos').select('id, categoria, cliente_id, fecha_firma_inicio, vigencia_anios, fecha_fin, garantia_meses, mant_clientes(nombre)'),
    ])
    setEdificios(edifCount || 0)
    setCategorias(cats)
    const tipoDe = (slug: string) => cats.find(c => c.slug === slug)?.tipo || 'auto'

    const rows = (contratosData || []) as any as Contrato[]
    const counts: Record<string, number> = {}
    let pv = 0, sg = 0, vg = 0
    rows.forEach(r => {
      counts[r.categoria] = (counts[r.categoria] || 0) + 1
      if (tipoDe(r.categoria) === 'auto') {
        const calc = calcularAuto(r.fecha_firma_inicio, r.vigencia_anios, hoy)
        if (calc) {
          if (calc.estado === 'Por vencer' || calc.estado === 'Renovado hoy') pv++
          else if (calc.estado === 'Seguimiento') sg++
          else vg++
        }
      } else {
        const calc = calcularObra(r.fecha_fin, r.garantia_meses, hoy)
        if (calc) {
          if (calc.estado === 'En ejecución') pv++
          else if (calc.estado === 'En garantía') sg++
          else vg++
        }
      }
    })
    setPorCategoria(counts)
    setPorVencer(pv)
    setSeguimiento(sg)
    setVigentes(vg)
    setLoading(false)
  }

  const statCards = [
    { label: 'Edificios', value: edificios, sub: 'Cartera compartida con Mantenimiento', icon: Building2, bg: '#EDE9FE', iconColor: '#7C3AED', href: '/contratos/edificios' },
    { label: 'Por vencer / en ejecución', value: porVencer, sub: '≤95 días o en curso', icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F', href: categorias[0] ? `/contratos/categoria/${categorias[0].slug}` : '/contratos/edificios' },
    { label: 'Seguimiento / garantía', value: seguimiento, sub: '≤180 días o en garantía', icon: Bell, bg: '#FEF3C7', iconColor: '#D97706', href: categorias[0] ? `/contratos/categoria/${categorias[0].slug}` : '/contratos/edificios' },
    { label: 'Vigentes', value: vigentes, sub: 'Sin novedades', icon: CheckCircle2, bg: '#E6F5EF', iconColor: '#1A7A4E', href: categorias[0] ? `/contratos/categoria/${categorias[0].slug}` : '/contratos/edificios' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Contratos</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Ascensores, rampas, servicios, obras y lo que agregues desde Configuración — vigencia calculada en vivo</p>
      </div>

      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 28 }}>
        {statCards.map(s => (
          <a key={s.label} href={s.href} className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <div className="stat-card-inner">
              <div className="stat-card-text">
                <div className="label">{s.label}</div>
                <div className="value">{loading ? '—' : s.value}</div>
                <div className="sub">{s.sub}</div>
              </div>
              <div className="stat-card-icon" style={{ background: s.bg }}>
                <s.icon size={20} color={s.iconColor} />
              </div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>Contratos por categoría</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {categorias.map(cat => {
          const Icon = ICONOS_CONOCIDOS[cat.slug] || FileText
          return (
            <a key={cat.slug} href={`/contratos/categoria/${cat.slug}`} style={{ textDecoration: 'none' }}>
              <div className="table-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={19} color="var(--gold)" />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>{loading ? '—' : (porCategoria[cat.slug] || 0)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.label}</div>
                </div>
              </div>
            </a>
          )
        })}
      </div>

      {!loading && Object.values(porCategoria).reduce((a, b) => a + b, 0) === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', marginTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Todavía no hay contratos cargados</div>
          <div style={{ fontSize: 12 }}>Empezá desde Edificios o directamente desde cualquier categoría del menú</div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
