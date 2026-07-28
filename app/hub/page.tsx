'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchCategorias, calcularAuto, calcularObra, hoyISO } from '@/lib/contratosConfig'

const NAVY = '#0F1E35'
const GOLD = '#C9A84C'

type Module = {
  id: string
  label: string
  description: string
  route: string
  ready: boolean
  accent: string
  icon: React.ReactNode
  stats?: { label: string; value: string | number }[]
}

function IconShield() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function IconWrench() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}
function IconFile() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function IconHardHat() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 10V5a2 2 0 0 1 4 0v5"/>
      <path d="M4 15a8 8 0 0 1 16 0Z"/>
      <path d="M4 15h16"/>
      <path d="M2 15h4"/>
      <path d="M18 15h4"/>
    </svg>
  )
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

export default function HubPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState('')
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({ polizas: 0, vencen30: 0, vencidas: 0, pendientes: 0 })
  const [mantStats, setMantStats] = useState({ edificios: 0, vencen30: 0 })
  const [contratosStats, setContratosStats] = useState({ contratos: 0, autoRenovados: 0 })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserName(user.email?.split('@')[0] || 'Usuario')

      const hoy = new Date()
      const en30 = new Date(); en30.setDate(en30.getDate() + 30)
      const hoyStr = hoy.toISOString().slice(0,10)
      const en30Str = en30.toISOString().slice(0,10)

      // Load seguros stats
      const [{ count: polizas }, { data: pagosData }] = await Promise.all([
        supabase.from('polizas').select('*', { count: 'exact', head: true }),
        supabase.from('pagos').select('poliza_id, cuota_num'),
      ])
      const { count: vencen30 } = await supabase.from('polizas').select('*', { count: 'exact', head: true })
        .gte('vencimiento', hoyStr)
        .lte('vencimiento', en30Str)
        .eq('renovada', false)
        .eq('renovacion_mensual', false)
      const { count: vencidas } = await supabase.from('polizas').select('*', { count: 'exact', head: true })
        .lt('vencimiento', hoyStr)
        .eq('renovada', false)
        .eq('renovacion_mensual', false)

      setStats({
        polizas: polizas || 0,
        vencen30: vencen30 || 0,
        vencidas: vencidas || 0,
        pendientes: 0,
      })

      // Load mantenimiento stats (solo el registro vigente de cada edificio, no todo el histórico)
      function soloVigentes(rows: any[]): any[] {
        const porCliente: Record<string, any[]> = {}
        rows.forEach(r => { if (r.cliente_id) (porCliente[r.cliente_id] ||= []).push(r) })
        return Object.values(porCliente).map(arr =>
          [...arr].sort((a, b) => (b.fecha_servicio || b.created_at || '').localeCompare(a.fecha_servicio || a.created_at || ''))[0]
        )
      }
      const [{ count: edificios }, { data: extRaw }, { data: tanRaw }] = await Promise.all([
        supabase.from('mant_clientes').select('*', { count: 'exact', head: true }),
        supabase.from('mant_extintores').select('id, cliente_id, fecha_servicio, vencimiento, created_at'),
        supabase.from('mant_tanques').select('id, cliente_id, fecha_servicio, vencimiento, created_at'),
      ])
      const extVigentes = soloVigentes(extRaw || [])
      const tanVigentes = soloVigentes(tanRaw || [])
      const enRango = (v: string | null) => !!v && v >= hoyStr && v <= en30Str
      const vencen30Mant = extVigentes.filter(r => enRango(r.vencimiento)).length + tanVigentes.filter(r => enRango(r.vencimiento)).length
      setMantStats({ edificios: edificios || 0, vencen30: vencen30Mant })

      // Load contratos stats (vigencia calculada en vivo; si se vence sin renovación manual, el
      // sistema la da por renovada sola con las mismas condiciones y queda marcada para revisar)
      const [catsContratos, { data: contratosData }] = await Promise.all([
        fetchCategorias(supabase),
        supabase.from('contratos').select('categoria, fecha_firma_inicio, vigencia_anios, fecha_fin, garantia_meses, renovado'),
      ])
      const tipoDeContrato = (slug: string) => catsContratos.find(c => c.slug === slug)?.tipo || 'auto'
      const hoyC = hoyISO()
      let autoRenovadosContr = 0
      const contratosActivos = (contratosData || []).filter((r: any) => !r.renovado)
      contratosActivos.forEach((r: any) => {
        if (tipoDeContrato(r.categoria) === 'auto') {
          const calc = calcularAuto(r.fecha_firma_inicio, r.vigencia_anios, hoyC)
          if (calc && calc.autoRenovado) autoRenovadosContr++
        }
      })
      setContratosStats({ contratos: contratosActivos.length, autoRenovados: autoRenovadosContr })

      setLoading(false)
    }
    init()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const modules: Module[] = [
    {
      id: 'seguros',
      label: 'Seguros',
      description: 'Pólizas, pagos, vencimientos, siniestros y documentos',
      route: '/dashboard',
      ready: true,
      accent: GOLD,
      icon: <IconShield />,
      stats: [
        { label: 'Pólizas', value: stats.polizas },
        { label: 'Vencidas', value: stats.vencidas },
        { label: 'Vencen en 30d', value: stats.vencen30 },
      ],
    },
    {
      id: 'mantenimiento',
      label: 'Mantenimiento',
      description: 'Control de extintores, tanques de agua y ensayos',
      route: '/mantenimiento',
      ready: true,
      accent: '#4FBE8C',
      icon: <IconWrench />,
      stats: [
        { label: 'Edificios', value: mantStats.edificios },
        { label: 'Vencen en 30d', value: mantStats.vencen30 },
      ],
    },
    {
      id: 'contratos',
      label: 'Contratos',
      description: 'Ascensores, rampas y servicios',
      route: '/contratos',
      ready: true,
      accent: '#9D7FD4',
      icon: <IconFile />,
      stats: [
        { label: 'Contratos', value: contratosStats.contratos },
        { label: 'Auto-renovados', value: contratosStats.autoRenovados },
      ],
    },
    {
      id: 'obras',
      label: 'Obras',
      description: 'Seguimiento de obras y garantías',
      route: '/obras',
      ready: false,
      accent: '#D9954F',
      icon: <IconHardHat />,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FB', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* Topbar */}
      <div style={{ background: NAVY, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px, 5vw, 32px)', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', minWidth: 0 }}>
          <img src="/logo-fascioli.svg" alt="Fascioli" style={{ height: 'clamp(20px, 5vw, 26px)', flexShrink: 0 }} />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.15)', margin: '0 4px', flexShrink: 0 }} />
          <span style={{ fontSize: 'clamp(9.5px, 2.6vw, 11px)', fontWeight: 700, color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Intranet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 14px)', flexShrink: 0 }}>
          <span style={{ fontSize: 12.5, color: '#B8C5D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'clamp(60px, 20vw, 200px)' }}>{userName}</span>
          <button onClick={handleLogout}
            style={{ fontSize: 12, color: '#8A9BB5', background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, padding: '5px clamp(9px, 2.4vw, 12px)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Salir
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(28px, 8vw, 52px) clamp(16px, 5vw, 24px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 'clamp(28px, 6vw, 40px)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Portal de gestión
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 6vw, 28px)', fontWeight: 800, color: NAVY, margin: '0 0 10px', lineHeight: 1.25 }}>
            ¿A qué módulo querés ingresar?
          </h1>
          <p style={{ fontSize: 'clamp(12.5px, 3.2vw, 13.5px)', color: '#8A9BB5', margin: 0, lineHeight: 1.6 }}>
            Seleccioná el área de trabajo. Cada módulo tiene su propio panel de gestión.
          </p>
        </div>

        {/* Module grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 'clamp(12px, 3vw, 16px)' }}>
        {modules.map(mod => (
            <ModuleCard key={mod.id} mod={mod} loading={loading} onClick={() => { if (mod.ready) router.push(mod.route) }} />
          ))}
        </div>

        <div style={{ marginTop: 'clamp(28px, 6vw, 40px)', textAlign: 'center', fontSize: 12, color: '#B8C5D6' }}>
          Fascioli Administraciones · Sistema interno de gestión
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ mod, loading, onClick }: { mod: Module; loading: any; onClick: () => void; key?: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 16,
        border: `2px solid ${hovered && mod.ready ? mod.accent : '#E2E8F0'}`,
        padding: 'clamp(20px, 5vw, 26px) clamp(18px, 5vw, 24px)',
        cursor: mod.ready ? 'pointer' : 'default',
        transition: 'all .18s ease',
        boxShadow: hovered && mod.ready ? '0 8px 28px rgba(15,30,53,.1)' : '0 1px 3px rgba(15,30,53,.05)',
        transform: hovered && mod.ready ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 'clamp(14px, 3vw, 18px)',
        opacity: mod.ready ? 1 : 0.65,
        minWidth: 0,
      }}>

      {/* Icon + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ width: 50, height: 50, borderRadius: 13, background: mod.ready ? NAVY : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: mod.ready ? mod.accent : '#94A3B8', flexShrink: 0 }}>
          {mod.icon}
        </div>
        {!mod.ready && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#94A3B8', background: '#F1F5F9', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap' }}>
            Próximamente
          </span>
        )}
      </div>

      {/* Text */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 5 }}>{mod.label}</div>
        <div style={{ fontSize: 13, color: '#8A9BB5', lineHeight: 1.5 }}>{mod.description}</div>
      </div>

      {/* Stats */}
      {mod.ready && mod.stats && mod.stats.length > 0 && (
        <div style={{ display: 'flex', gap: 'clamp(14px, 4vw, 20px)', borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
          {mod.stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>
                {loading ? '—' : s.value}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {mod.ready && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: hovered ? NAVY : '#94A3B8', transition: 'color .15s' }}>
            Ingresar al módulo
          </span>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: hovered ? NAVY : '#F4F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hovered ? 'white' : '#94A3B8', transition: 'all .15s', flexShrink: 0 }}>
            <IconArrow />
          </div>
        </div>
      )}
    </div>
  )
}

