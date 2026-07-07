'use client'
import { SortState } from '@/hooks/useSortFilter'

export function SortHeader({ label, col, sort, onSort, style }: {
  label: string
  col: string
  sort: SortState
  onSort: (col: string) => void
  style?: React.CSSProperties
}) {
  const active = sort.col === col
  return (
    <th onClick={() => onSort(col)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {label}
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, gap: 1 }}>
          <svg width="7" height="4" viewBox="0 0 7 4" style={{ opacity: active && sort.dir === 'asc' ? 1 : 0.25 }}>
            <path d="M3.5 0L7 4H0L3.5 0Z" fill="currentColor"/>
          </svg>
          <svg width="7" height="4" viewBox="0 0 7 4" style={{ opacity: active && sort.dir === 'desc' ? 1 : 0.25 }}>
            <path d="M3.5 4L0 0H7L3.5 4Z" fill="currentColor"/>
          </svg>
        </span>
      </span>
    </th>
  )
}

