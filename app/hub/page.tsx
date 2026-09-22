'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchCategorias, calcularAuto, calcularObra, hoyISO } from '@/lib/contratosConfig'
import { fetchObrasCompletas } from '@/lib/obrasData'
import { obraActiva } from '@/lib/obrasConfig'

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
  stats?: { label: string; value: string | number; tone?: 'danger' | 'warn' }[]
  atajo: string
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
  const [mantStats, setMantStats] = useState({ edificios: 0, vencen30: 0, vencidos: 0 })
  const [contratosStats, setContratosStats] = useState({ contratos: 0, vencidos: 0, autoRenovados: 0 })
  const [obrasStats, setObrasStats] = useState({ enCurso: 0, atrasados: 0, alertas: 0 })

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
      const vencido = (v: string | null) => !!v && v < hoyStr
      const vencidosMant = extVigentes.filter(r => vencido(r.vencimiento)).length + tanVigentes.filter(r => vencido(r.vencimiento)).length
      setMantStats({ edificios: edificios || 0, vencen30: vencen30Mant, vencidos: vencidosMant })

      // Load contratos stats (vigencia calculada en vivo; si se vence sin renovación manual, el
      // sistema la da por renovada sola con las mismas condiciones y queda marcada para revisar)
      const [catsContratos, { data: contratosData }] = await Promise.all([
        fetchCategorias(supabase),
        supabase.from('contratos').select('categoria, fecha_firma_inicio, vigencia_anios, fecha_fin, garantia_meses, renovado, telegrama_no_renovacion'),
      ])
      const tipoDeContrato = (slug: string) => catsContratos.find(c => c.slug === slug)?.tipo || 'auto'
      const hoyC = hoyISO()
      let autoRenovadosContr = 0, vencidosContr = 0
      const contratosActivos = (contratosData || []).filter((r: any) => !r.renovado)
      contratosActivos.forEach((r: any) => {
        if (tipoDeContrato(r.categoria) === 'auto') {
          const calc = calcularAuto(r.fecha_firma_inicio, r.vigencia_anios, hoyC, r.telegrama_no_renovacion)
          if (calc?.estado === 'Vencido') vencidosContr++
          else if (calc?.autoRenovado) autoRenovadosContr++
        }
      })
      setContratosStats({ contratos: contratosActivos.length, vencidos: vencidosContr, autoRenovados: autoRenovadosContr })

      // Load obras stats (si las tablas todavía no existen, devuelve vacío y el portal sigue andando)
      const obras = await fetchObrasCompletas(supabase)
      const obrasVivas = obras
      setObrasStats({
        enCurso: obrasVivas.filter(o => obraActiva(o)).length,
        atrasados: obrasVivas.reduce((s, o) => s + o.rp.vencidos.length, 0),
        alertas: obrasVivas.filter(o => !o.cerrada && (o.cierre.pendiente || o.rl.alerta === 'excedido')).length,
      })

      setLoading(false)
    }
    init()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tono = (n: number, t: 'danger' | 'warn') => (n > 0 ? t : undefined)

  const modules: Module[] = [
    {
      id: 'seguros', label: 'Seguros', atajo: '1',
      description: 'Pólizas, pagos, vencimientos, siniestros y documentos',
      route: '/dashboard', ready: true, accent: GOLD, icon: <IconShield />,
      stats: [
        { label: 'Pólizas', value: stats.polizas },
        { label: 'Vencidas', value: stats.vencidas, tone: tono(stats.vencidas, 'danger') },
        { label: 'Vencen en 30 días', value: stats.vencen30, tone: tono(stats.vencen30, 'warn') },
      ],
    },
    {
      id: 'mantenimiento', label: 'Mantenimiento', atajo: '2',
      description: 'Extintores, tanques de agua, ensayos y bomberos',
      route: '/mantenimiento', ready: true, accent: '#4FBE8C', icon: <IconWrench />,
      stats: [
        { label: 'Edificios', value: mantStats.edificios },
        { label: 'Vencidos', value: mantStats.vencidos, tone: tono(mantStats.vencidos, 'danger') },
        { label: 'Vencen en 30 días', value: mantStats.vencen30, tone: tono(mantStats.vencen30, 'warn') },
      ],
    },
    {
      id: 'contratos', label: 'Contratos', atajo: '3',
      description: 'Ascensores, rampas y servicios mensuales',
      route: '/contratos', ready: true, accent: '#9D7FD4', icon: <IconFile />,
      stats: [
        { label: 'Contratos', value: contratosStats.contratos },
        { label: 'Vencidos', value: contratosStats.vencidos, tone: tono(contratosStats.vencidos, 'danger') },
        { label: 'Auto-renovados', value: contratosStats.autoRenovados, tone: tono(contratosStats.autoRenovados, 'warn') },
      ],
    },
    {
      id: 'obras', label: 'Obras', atajo: '4',
      description: 'Pagos, leyes sociales, garantías y cierres BPS',
      route: '/obras', ready: true, accent: '#D9954F', icon: <IconHardHat />,
      stats: [
        { label: 'Abiertas', value: obrasStats.enCurso },
        { label: 'Pagos atrasados', value: obrasStats.atrasados, tone: tono(obrasStats.atrasados, 'danger') },
        { label: 'Alertas', value: obrasStats.alertas, tone: tono(obrasStats.alertas, 'warn') },
      ],
    },
  ]

  // Atajos de teclado: 1-4 abren cada módulo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const m = modules.find(x => x.atajo === e.key)
      if (m?.ready) router.push(m.route)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pendientes = stats.vencidas + mantStats.vencidos + contratosStats.vencidos + obrasStats.atrasados
  const nombre = userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : ''
  const ahora = new Date()
  const hora = Number(new Intl.DateTimeFormat('es-UY', { hour: 'numeric', hour12: false, timeZone: 'America/Montevideo' }).format(ahora))
  const saludo = hora < 12 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const fechaLarga = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Montevideo' }).format(ahora)

  return (
    <div className="hub">
      <style>{HUB_CSS}</style>

      {/* Hero */}
      <header className="hub-hero">
        <div className="hub-glow hub-glow-1" />
        <div className="hub-glow hub-glow-2" />
        <div className="hub-grid-bg" />

        <nav className="hub-top">
          <div className="hub-brand">
            <img src="/logo-fascioli.svg" alt="Fascioli" />
            <span className="hub-sep" />
            <span className="hub-tag">Intranet</span>
          </div>
          <div className="hub-user">
            <span className="hub-avatar">{nombre.charAt(0) || '·'}</span>
            <span className="hub-username">{nombre}</span>
            <button onClick={handleLogout} className="hub-logout">Salir</button>
          </div>
        </nav>

        <div className="hub-hero-inner">
          <div className="hub-date">{fechaLarga}</div>
          <h1>{saludo}{nombre ? `, ${nombre}` : ''}</h1>
          <p>¿A qué módulo querés ingresar?</p>
          <div className={`hub-pill ${loading ? '' : pendientes > 0 ? 'is-alert' : 'is-ok'}`}>
            <span className="hub-dot" />
            {loading ? 'Cargando novedades…' : pendientes > 0 ? `${pendientes} ${pendientes === 1 ? 'tema vencido o atrasado' : 'temas vencidos o atrasados'} para revisar` : 'Todo al día, sin vencidos ni atrasos'}
          </div>
        </div>
      </header>

      {/* Módulos */}
      <main className="hub-main">
        <div className="hub-cards">
          {modules.map((mod, i) => (
            <ModuleCard key={mod.id} mod={mod} loading={loading} index={i} onClick={() => { if (mod.ready) router.push(mod.route) }} />
          ))}
        </div>
        <div className="hub-foot">
          Fascioli Administraciones · Sistema interno de gestión <span className="hub-foot-keys">Atajos: <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd></span>
        </div>
      </main>
    </div>
  )
}

function ModuleCard({ mod, loading, index, onClick }: { mod: Module; loading: boolean; index: number; onClick: () => void; key?: string }) {
  return (
    <button type="button" className="hub-card" onClick={onClick} disabled={!mod.ready}
      style={{ ['--accent' as any]: mod.accent, animationDelay: `${index * 70}ms` }}>
      <span className="hub-card-shine" />
      <div className="hub-card-head">
        <div className="hub-icon">{mod.icon}</div>
        <div className="hub-card-title">
          <div className="hub-card-label">{mod.label}</div>
          <div className="hub-card-desc">{mod.description}</div>
        </div>
        <span className="hub-kbd" title={`Atajo: tecla ${mod.atajo}`}>{mod.atajo}</span>
      </div>

      {mod.stats && mod.stats.length > 0 && (
        <div className="hub-stats">
          {mod.stats.map(s => (
            <div key={s.label} className={`hub-stat ${!loading && s.tone ? `tone-${s.tone}` : ''}`}>
              <div className="hub-stat-val">{loading ? <span className="hub-skel" /> : s.value}</div>
              <div className="hub-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="hub-cta">
        <span>Ingresar</span>
        <span className="hub-arrow"><IconArrow /></span>
      </div>
    </button>
  )
}

const HUB_CSS = `
.hub { min-height: 100vh; background: #F3F5F9; font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; color: ${NAVY}; }

.hub-hero { position: relative; overflow: hidden; background: radial-gradient(120% 140% at 0% 0%, #1B3155 0%, ${NAVY} 45%, #0A1526 100%); padding-bottom: 120px; }
.hub-glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .45; pointer-events: none; }
.hub-glow-1 { width: 420px; height: 420px; background: ${GOLD}; top: -220px; right: 8%; opacity: .22; }
.hub-glow-2 { width: 360px; height: 360px; background: #5B7FD1; bottom: -200px; left: -80px; opacity: .25; }
.hub-grid-bg { position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 44px 44px; mask-image: radial-gradient(ellipse at 50% 0%, #000 30%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse at 50% 0%, #000 30%, transparent 75%); }

.hub-top { position: relative; z-index: 2; max-width: 1120px; margin: 0 auto; height: 68px; display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(16px, 4vw, 32px); }
.hub-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.hub-brand img { height: clamp(20px, 5vw, 26px); flex-shrink: 0; }
.hub-sep { width: 1px; height: 20px; background: rgba(255,255,255,.18); }
.hub-tag { font-size: 11px; font-weight: 700; color: ${GOLD}; letter-spacing: .14em; text-transform: uppercase; }
.hub-user { display: flex; align-items: center; gap: 10px; }
.hub-avatar { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 800; color: ${NAVY}; background: linear-gradient(135deg, #E8CF85, ${GOLD}); }
.hub-username { font-size: 13px; color: #C9D4E3; max-width: 22vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hub-logout { font: inherit; font-size: 12px; color: #C9D4E3; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 999px; padding: 6px 14px; cursor: pointer; transition: all .15s; backdrop-filter: blur(8px); }
.hub-logout:hover { background: rgba(255,255,255,.14); color: white; }

.hub-hero-inner { position: relative; z-index: 2; max-width: 1120px; margin: 0 auto; padding: clamp(28px, 6vw, 56px) clamp(16px, 4vw, 32px) 0; }
.hub-date { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: ${GOLD}; margin-bottom: 12px; }
.hub-hero h1 { margin: 0; font-size: clamp(28px, 5.5vw, 44px); font-weight: 800; letter-spacing: -.025em; line-height: 1.1; color: white; }
.hub-hero p { margin: 10px 0 22px; font-size: clamp(14px, 2.4vw, 16px); color: #9FB0C8; }
.hub-pill { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 600; color: #DDE5F0; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); padding: 8px 15px; border-radius: 999px; backdrop-filter: blur(10px); }
.hub-dot { width: 8px; height: 8px; border-radius: 50%; background: #8A9BB5; }
.hub-pill.is-alert .hub-dot { background: #F87171; box-shadow: 0 0 0 0 rgba(248,113,113,.6); animation: hubPulse 1.8s infinite; }
.hub-pill.is-ok .hub-dot { background: #4ADE80; }

.hub-main { position: relative; z-index: 3; max-width: 1120px; margin: -84px auto 0; padding: 0 clamp(16px, 4vw, 32px) 48px; }
.hub-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(14px, 2.2vw, 20px); }
@media (max-width: 760px) { .hub-cards { grid-template-columns: 1fr; } .hub-username { display: none; } }

.hub-card { all: unset; box-sizing: border-box; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 22px; cursor: pointer;
  background: rgba(255,255,255,.92); backdrop-filter: blur(14px); border: 1px solid #E3E8F0; border-radius: 22px; padding: clamp(20px, 3vw, 28px);
  box-shadow: 0 1px 2px rgba(15,30,53,.04), 0 12px 32px -12px rgba(15,30,53,.14);
  transition: transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s, border-color .22s; animation: hubIn .5s cubic-bezier(.2,.8,.2,1) backwards; }
.hub-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--accent), transparent 80%); opacity: .9; }
.hub-card:hover, .hub-card:focus-visible { transform: translateY(-4px); border-color: color-mix(in srgb, var(--accent) 55%, #E3E8F0); box-shadow: 0 2px 4px rgba(15,30,53,.05), 0 24px 48px -16px color-mix(in srgb, var(--accent) 45%, rgba(15,30,53,.25)); }
.hub-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.hub-card[disabled] { opacity: .55; cursor: default; }
.hub-card-shine { position: absolute; width: 260px; height: 260px; border-radius: 50%; right: -120px; top: -140px; background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%); pointer-events: none; transition: transform .4s; }
.hub-card:hover .hub-card-shine { transform: scale(1.25); }

.hub-card-head { display: flex; align-items: center; gap: 16px; position: relative; }
.hub-icon { width: 54px; height: 54px; border-radius: 16px; flex-shrink: 0; display: grid; place-items: center; color: var(--accent);
  background: linear-gradient(145deg, #1B3155, ${NAVY}); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 8px 18px -8px rgba(15,30,53,.6); transition: transform .22s; }
.hub-card:hover .hub-icon { transform: rotate(-6deg) scale(1.05); }
.hub-card-title { flex: 1; min-width: 0; }
.hub-card-label { font-size: 19px; font-weight: 800; letter-spacing: -.01em; color: ${NAVY}; }
.hub-card-desc { font-size: 13px; color: #7C8DA6; margin-top: 3px; line-height: 1.45; }
.hub-kbd { align-self: flex-start; font-size: 11px; font-weight: 700; color: #94A3B8; border: 1px solid #E3E8F0; border-bottom-width: 2px; border-radius: 6px; padding: 1px 7px; background: #F8FAFC; }

.hub-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; position: relative; }
.hub-stat { background: #F5F7FA; border: 1px solid #EDF1F6; border-radius: 14px; padding: 12px 12px 10px; min-width: 0; transition: background .2s; }
.hub-stat-val { font-size: 24px; font-weight: 800; letter-spacing: -.02em; color: ${NAVY}; line-height: 1.1; font-variant-numeric: tabular-nums; min-height: 26px; }
.hub-stat-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #94A3B8; margin-top: 4px; line-height: 1.3; }
.hub-stat.tone-danger { background: #FEF2F2; border-color: #FEE2E2; }
.hub-stat.tone-danger .hub-stat-val { color: #DC2626; }
.hub-stat.tone-danger .hub-stat-lbl { color: #F87171; }
.hub-stat.tone-warn { background: #FFFBEB; border-color: #FEF3C7; }
.hub-stat.tone-warn .hub-stat-val { color: #B45309; }
.hub-stat.tone-warn .hub-stat-lbl { color: #D9A441; }
.hub-skel { display: inline-block; width: 38px; height: 20px; border-radius: 6px; background: linear-gradient(90deg, #E8EDF3, #F4F7FA, #E8EDF3); background-size: 200% 100%; animation: hubShimmer 1.2s infinite; vertical-align: middle; }

.hub-cta { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; color: #94A3B8; transition: color .2s; position: relative; }
.hub-card:hover .hub-cta { color: ${NAVY}; }
.hub-arrow { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: #F1F4F8; color: #94A3B8; transition: all .22s; }
.hub-card:hover .hub-arrow { background: var(--accent); color: white; transform: translateX(3px); }

.hub-foot { margin-top: 36px; display: flex; justify-content: center; align-items: center; gap: 18px; flex-wrap: wrap; font-size: 12px; color: #A3B1C6; }
.hub-foot-keys { display: inline-flex; align-items: center; gap: 4px; }
.hub-foot kbd { font: inherit; font-size: 10.5px; font-weight: 700; border: 1px solid #DCE3EC; border-bottom-width: 2px; border-radius: 5px; padding: 0 6px; background: white; color: #7C8DA6; }
@media (hover: none) { .hub-kbd, .hub-foot-keys { display: none; } }

@keyframes hubIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes hubShimmer { to { background-position: -200% 0; } }
@keyframes hubPulse { 0% { box-shadow: 0 0 0 0 rgba(248,113,113,.6); } 70% { box-shadow: 0 0 0 8px rgba(248,113,113,0); } 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); } }
@media (prefers-reduced-motion: reduce) { .hub-card, .hub-pill .hub-dot { animation: none !important; } }
`
