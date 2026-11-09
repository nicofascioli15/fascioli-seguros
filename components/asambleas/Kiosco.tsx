'use client'
import { ThumbsUp, ThumbsDown, MinusCircle, CheckCircle2, XCircle } from 'lucide-react'
import type { Voto } from '@/lib/asambleas'
// Pantalla completa para usar en la tablet que se pasa de mano en mano (votación y acreditación).

export function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 340, background: 'radial-gradient(120% 120% at 0% 0%, #1B3155 0%, #0F1E35 50%, #0A1526 100%)', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {children}
      <style>{`
        .kz-mini { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 14px; font-weight: 700; color: #E2E8F0; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); border-radius: 10px; padding: 9px 14px; cursor: pointer; white-space: nowrap; }
        .kz-mini:hover { background: rgba(255,255,255,.15); }
        .kz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        .kz-persona { all: unset; box-sizing: border-box; cursor: pointer; padding: 18px; border-radius: 16px; background: rgba(255,255,255,.06); border: 1.5px solid rgba(255,255,255,.12); transition: transform .12s, background .12s, border-color .12s; min-height: 96px; }
        .kz-persona:active { transform: scale(.98); }
        .kz-persona:hover:not(.listo) { background: rgba(226,196,122,.12); border-color: #E2C47A; }
        .kz-persona.listo { opacity: .55; cursor: default; border-color: rgba(74,222,128,.35); }
        .kz-ok { width: 26px; height: 26px; border-radius: 50%; background: #16A34A; display: grid; place-items: center; }
        .kz-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #E2C47A; background: rgba(226,196,122,.15); padding: 3px 8px; border-radius: 6px; }
        .kz-confirmar { all: unset; box-sizing: border-box; width: 100%; margin-top: 22px; padding: 20px; border-radius: 16px; background: #16A34A; color: white; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; }
        .kz-confirmar:disabled { background: rgba(255,255,255,.12); color: rgba(255,255,255,.4); cursor: not-allowed; }
        .kz-voto { all: unset; box-sizing: border-box; flex: 1; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font-weight: 800; cursor: pointer; border: 2px solid transparent; transition: transform .1s, box-shadow .1s, opacity .1s; }
        .kz-voto:active { transform: scale(.97); }
        .kz-input { width: 100%; box-sizing: border-box; padding: 15px 16px; font-size: 18px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,.18); background: rgba(255,255,255,.07); color: white; outline: none; font-family: inherit; }
        .kz-input:focus { border-color: #E2C47A; background: rgba(255,255,255,.1); }
        .kz-label { display: block; font-size: 13px; font-weight: 700; color: #B8C5D6; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .05em; }
        .kz-opcion { all: unset; box-sizing: border-box; flex: 1; padding: 18px; border-radius: 14px; border: 2px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); cursor: pointer; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; text-align: center; }
        .kz-opcion.sel { border-color: #E2C47A; background: rgba(226,196,122,.16); color: #E2C47A; }
        .kz-chip { all: unset; cursor: pointer; padding: 9px 14px; border-radius: 999px; background: rgba(226,196,122,.14); color: #E2C47A; font-weight: 700; font-size: 15px; border: 1px solid rgba(226,196,122,.35); }
        @keyframes kzPop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  )
}


export function BotonesVoto({ valor, onVoto, grande }: { valor?: Voto; onVoto: (v: Voto) => void; grande?: boolean }) {
  const ops: { v: Voto; label: string; icon: any; bg: string; borde: string }[] = [
    { v: 'si', label: 'A favor', icon: ThumbsUp, bg: '#16A34A', borde: '#4ADE80' },
    { v: 'no', label: 'En contra', icon: ThumbsDown, bg: '#DC2626', borde: '#F87171' },
    { v: 'abstencion', label: 'Abstención', icon: MinusCircle, bg: '#475569', borde: '#94A3B8' },
  ]
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {ops.map(o => {
        const sel = valor === o.v
        const Icon = o.icon
        return (
          <button key={o.v} className="kz-voto" onClick={() => onVoto(o.v)}
            style={{ background: sel ? o.bg : 'rgba(255,255,255,.06)', borderColor: sel ? o.borde : 'rgba(255,255,255,.12)', opacity: valor && !sel ? .55 : 1, padding: grande ? '26px 10px' : '16px 8px', fontSize: grande ? 21 : 17, boxShadow: sel ? `0 0 0 4px ${o.borde}33` : 'none' }}>
            <Icon size={grande ? 34 : 24} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Resultado de una moción cerrada: a favor / en contra / abstenciones, claro y grande.
export type ResultadoMocion = {
  id: string; orden: number; titulo: string; descripcion: string | null; estado: 'pendiente' | 'votando' | 'cerrada'; aprobada: boolean | null
  si: number; no: number; abstencion: number; si_coef: number; no_coef: number; abstencion_coef: number; acreditadas: number
}

export function ResultadoCard({ r, conCoef, grande }: { r: ResultadoMocion; conCoef?: boolean; grande?: boolean }) {
  const total = r.si + r.no + r.abstencion
  const filas = [
    { label: 'A favor', n: r.si, c: r.si_coef, color: '#22C55E' },
    { label: 'En contra', n: r.no, c: r.no_coef, color: '#EF4444' },
    { label: 'Abstención', n: r.abstencion, c: r.abstencion_coef, color: '#94A3B8' },
  ]
  const fmt = (x: number) => Math.round(Number(x) * 100) / 100
  return (
    <div style={{ background: 'rgba(255,255,255,.05)', border: `1.5px solid ${r.aprobada ? 'rgba(74,222,128,.45)' : 'rgba(248,113,113,.45)'}`, borderRadius: 16, padding: grande ? 22 : 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#E2C47A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Moción {r.orden}</div>
          <div style={{ fontSize: grande ? 22 : 17, fontWeight: 800, marginTop: 2 }}>{r.titulo}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: grande ? 17 : 14, padding: '6px 12px', borderRadius: 999, flexShrink: 0,
          background: r.aprobada ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)', color: r.aprobada ? '#4ADE80' : '#F87171' }}>
          {r.aprobada ? <CheckCircle2 size={grande ? 20 : 16} /> : <XCircle size={grande ? 20 : 16} />} {r.aprobada ? 'APROBADA' : 'RECHAZADA'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filas.map(f => (
          <div key={f.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: grande ? 17 : 15, fontWeight: 700, marginBottom: 5 }}>
              <span>{f.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{f.n} {f.n === 1 ? 'unidad' : 'unidades'}{conCoef ? ` · ${fmt(f.c)}%` : ''}</span>
            </div>
            <div style={{ height: grande ? 14 : 10, borderRadius: 8, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${total ? (f.n / total) * 100 : 0}%`, background: f.color, borderRadius: 8, transition: 'width .5s' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#8A9BB5', marginTop: 12 }}>Votaron {total} de {r.acreditadas} unidades presentes</div>
    </div>
  )
}
