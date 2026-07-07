'use client'
import { useState } from 'react'
import { Calendar, X, ChevronDown } from 'lucide-react'

export type DateRange = { from: string; to: string }

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i)

function MonthYearPicker({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const parsed = value ? { y: parseInt(value.slice(0,4)), m: parseInt(value.slice(5,7)) - 1 } : null
  const [selYear, setSelYear] = useState(parsed?.y || currentYear)

  function select(m: number) {
    onChange(`${selYear}-${String(m+1).padStart(2,'0')}-01`)
    setOpen(false)
  }

  const label = parsed
    ? `${MESES[parsed.m]} ${parsed.y}`
    : placeholder

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: `1.5px solid ${value ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 7, background: value ? 'var(--gold-pale)' : 'var(--bg-card)', cursor: 'pointer', fontSize: 12.5, color: value ? 'var(--navy)' : 'var(--text-muted)', fontFamily: 'inherit', fontWeight: value ? 600 : 400, whiteSpace: 'nowrap' }}>
        {label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 200 }}>
          {/* Year selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <button onClick={() => setSelYear(y => y - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 6px' }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{selYear}</span>
            <button onClick={() => setSelYear(y => y + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 6px' }}>›</button>
          </div>
          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
            {MESES.map((m, i) => {
              const isSelected = parsed && parsed.y === selYear && parsed.m === i
              return (
                <button key={m} onClick={() => select(i)}
                  style={{ padding: '6px 4px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: isSelected ? 700 : 400, background: isSelected ? 'var(--navy)' : 'transparent', color: isSelected ? 'white' : 'var(--text-main)', fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                  {m}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { onChange(''); setOpen(false) }}
              style={{ width: '100%', padding: '5px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11.5, color: 'var(--danger)', background: 'none', fontFamily: 'inherit' }}>
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DateRangeFilter({ value, onChange, label = 'Fecha' }: {
  value: DateRange
  onChange: (v: DateRange) => void
  label?: string
}) {
  const hasFilter = value.from || value.to

  if (!hasFilter) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={13} /> {label}:
        </span>
        <MonthYearPicker value="" onChange={from => onChange({ ...value, from })} placeholder="Desde" />
        <MonthYearPicker value="" onChange={to => onChange({ ...value, to })} placeholder="Hasta" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Calendar size={13} /> {label}:
      </span>
      <MonthYearPicker value={value.from} onChange={from => onChange({ ...value, from })} placeholder="Desde" />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
      <MonthYearPicker value={value.to} onChange={to => onChange({ ...value, to })} placeholder="Hasta" />
      <button onClick={() => onChange({ from: '', to: '' })}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: 2 }}
        title="Limpiar filtro">
        <X size={13} />
      </button>
    </div>
  )
}

