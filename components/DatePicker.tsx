'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS  = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', disabled }: Props) {
  const [open, setOpen]         = useState(false)
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.slice(0,4)) : new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5,7)) - 1 : new Date().getMonth())
  const [pos, setPos]           = useState({ top: 0, left: 0, width: 0 })
  const triggerRef              = useRef<HTMLDivElement>(null)
  const calRef                  = useRef<HTMLDivElement>(null)

  // Calculate dropdown position when opening
  function openCalendar() {
    if (disabled || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const calH = 340 // approximate calendar height
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= calH
      ? rect.bottom + window.scrollY + 6
      : rect.top + window.scrollY - calH - 6
    setPos({ top, left: rect.left + window.scrollX, width: Math.max(rect.width, 280) })
    setOpen(o => !o)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        calRef.current && !calRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on scroll
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.slice(0,4)))
      setViewMonth(parseInt(value.slice(5,7)) - 1)
    }
  }, [value])

  function formatDisplay(v: string) {
    if (!v) return ''
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year: number, month: number) {
    const d = new Date(year, month, 1).getDay()
    return d === 0 ? 6 : d - 1
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const today    = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const daysInMonth    = getDaysInMonth(viewYear, viewMonth)
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth)

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const calendar = (
    <div
      ref={calRef}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        width: Math.max(pos.width, 280),
        zIndex: 9999,
        background: 'var(--bg-card)',
        borderRadius: 14,
        border: '1.5px solid var(--border-soft)',
        boxShadow: '0 16px 48px rgba(15,30,53,.18)',
        padding: '16px',
        animation: 'dpFadeIn .15s ease',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Month/Year nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        ><ChevronLeft size={16} /></button>

        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-main)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>{MESES[viewMonth]}</span>
          <select value={viewYear} onChange={e => setViewYear(+e.target.value)}
            style={{ border: 'none', background: 'none', fontWeight: 800, fontSize: 15, color: 'var(--text-main)', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            {Array.from({ length: 15 }, (_, i) => today.getFullYear() - 2 + i).map(y =>
              <option key={y} value={y}>{y}</option>
            )}
          </select>
        </div>

        <button onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        ><ChevronRight size={16} /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
        {DIAS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const mm  = String(viewMonth + 1).padStart(2, '0')
          const dd  = String(day).padStart(2, '0')
          const str = `${viewYear}-${mm}-${dd}`
          const isSel   = str === value
          const isToday = str === todayStr
          return (
            <div key={idx} onClick={() => selectDay(day)}
              style={{
                textAlign: 'center', padding: '7px 4px', borderRadius: 8,
                fontSize: 13.5, fontWeight: isSel || isToday ? 700 : 400,
                cursor: 'pointer', transition: 'all .1s',
                background: isSel ? 'var(--navy)' : isToday ? 'var(--gold-pale)' : 'transparent',
                color: isSel ? 'var(--gold)' : isToday ? 'var(--gold)' : 'var(--navy)',
                border: isToday && !isSel ? '1.5px solid var(--gold)' : '1.5px solid transparent',
              }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = '#F4F7FB' }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = isToday ? 'var(--gold-pale)' : 'transparent' }}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { onChange(todayStr); setOpen(false) }}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-pale)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >Hoy</button>
        {value && (
          <button onClick={() => { onChange(''); setOpen(false) }}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >Limpiar</button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Trigger */}
      <div ref={triggerRef} onClick={openCalendar} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 13px',
        border: `1.5px solid ${open ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 8,
        background: disabled ? '#F8FAFC' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color .14s',
        userSelect: 'none',
      }}>
        <Calendar size={15} color={value ? 'var(--navy)' : 'var(--slate)'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14, color: value ? 'var(--navy)' : 'var(--slate)' }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && (
          <span onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px', cursor: 'pointer' }}>×</span>
        )}
      </div>

      {/* Portal calendar — renders outside any overflow:hidden container */}
      {open && typeof document !== 'undefined' && createPortal(calendar, document.body)}

      <style>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(4px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </>
  )
}


