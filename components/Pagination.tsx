'use client'

const PAGE_SIZE = 25

export { PAGE_SIZE }

export function paginate<T>(data: T[], page: number): T[] {
  return data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

export function Pagination({ page, total, onChange }: {
  page: number
  total: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  // Build page numbers to show: always first, last, current ±1, with ellipsis
  const pages: (number | '...')[] = []
  const around = new Set([1, totalPages, page - 1, page, page + 1].filter(p => p >= 1 && p <= totalPages))
  const sorted = [...around].sort((a, b) => a - b)
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) pages.push('...')
    pages.push(p)
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '12px 0', borderTop: '1px solid var(--border-soft)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de <strong>{total}</strong>
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--border-soft)', background: 'var(--bg-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ width: 34, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)}
              style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${page === p ? 'var(--navy)' : 'var(--border-soft)'}`, background: page === p ? 'var(--navy)' : 'var(--bg-card)', color: page === p ? 'white' : 'var(--text-main)', cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 700 : 400, fontFamily: 'inherit' }}>
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--border-soft)', background: 'var(--bg-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
          ›
        </button>
      </div>
    </div>
  )
}

