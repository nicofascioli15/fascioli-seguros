'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

export type MenuAction = { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }

export default function ActionsMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function toggle() {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const menuWidth = 210
    setPos({
      top: r.bottom + window.scrollY + 4,
      left: Math.max(8, r.right + window.scrollX - menuWidth),
    })
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={e => { e.stopPropagation(); toggle() }} title="Acciones"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', display: 'inline-flex', alignItems: 'center', borderRadius: 6, verticalAlign: 'middle' }}>
        <MoreHorizontal size={17} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef} onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, width: 210,
          background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(15,30,53,.18)', overflow: 'hidden',
        }}>
          {actions.map((a, i) => (
            <button key={i} onClick={() => { setOpen(false); a.onClick() }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: a.danger ? 'var(--danger)' : 'var(--navy)', fontFamily: 'inherit', textAlign: 'left', whiteSpace: 'nowrap' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = a.danger ? '#FEE2E2' : 'var(--bg-card-alt)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
