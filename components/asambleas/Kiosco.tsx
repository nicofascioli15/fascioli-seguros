'use client'
import { ThumbsUp, ThumbsDown, MinusCircle } from 'lucide-react'
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
