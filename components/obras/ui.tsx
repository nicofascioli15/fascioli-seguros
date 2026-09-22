'use client'
// Piezas visuales chicas que se repiten en el módulo Obras.

export function Barra({ pct, color = 'var(--gold)', alto = 6, fondo = 'var(--border-soft)', marcaTope }: { pct: number; color?: string; alto?: number; fondo?: string; marcaTope?: boolean }) {
  const p = Math.max(0, Math.min(1, pct || 0))
  return (
    <div style={{ position: 'relative', height: alto, borderRadius: alto, background: fondo, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${p * 100}%`, height: '100%', background: color, borderRadius: alto, transition: 'width .3s ease' }} />
      {marcaTope && <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, background: 'var(--danger)' }} />}
    </div>
  )
}

export function colorLeyes(alerta: 'ok' | 'cerca' | 'excedido' | 'sin_tope'): string {
  if (alerta === 'excedido') return 'var(--danger)'
  if (alerta === 'cerca') return '#D97706'
  if (alerta === 'ok') return '#2E9668'
  return 'var(--slate)'
}

export function Kpi({ label, valor, sub, color }: { label: string; valor: React.ReactNode; sub?: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--text-main)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
