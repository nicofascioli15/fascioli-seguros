'use client'
import { Calendar, X } from 'lucide-react'

export type DateRange = { from: string; to: string }

export function DateRangeFilter({ value, onChange, label = 'Fecha' }: {
  value: DateRange
  onChange: (v: DateRange) => void
  label?: string
}) {
  const hasFilter = value.from || value.to

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', border: `1.5px solid ${hasFilter ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 8, background: hasFilter ? 'var(--gold-pale)' : 'var(--bg-card)', fontSize: 13 }}>
        <Calendar size={14} color={hasFilter ? 'var(--gold)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{label}</span>
        <input
          type="date"
          value={value.from}
          onChange={e => onChange({ ...value, from: e.target.value })}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--text-main)', fontFamily: 'inherit', width: 120 }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
        <input
          type="date"
          value={value.to}
          onChange={e => onChange({ ...value, to: e.target.value })}
          style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--text-main)', fontFamily: 'inherit', width: 120 }}
        />
      </div>
      {hasFilter && (
        <button onClick={() => onChange({ from: '', to: '' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4 }}
          title="Limpiar filtro">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

