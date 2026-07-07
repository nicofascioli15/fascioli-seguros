import { useState, useCallback } from 'react'

export type SortDir = 'asc' | 'desc' | null
export type SortState = { col: string; dir: SortDir }

export function useSortFilter<T>(data: T[]) {
  const [sort, setSort] = useState<SortState>({ col: '', dir: null })

  const toggleSort = useCallback((col: string) => {
    setSort(prev => {
      if (prev.col !== col) return { col, dir: 'asc' }
      if (prev.dir === 'asc') return { col, dir: 'desc' }
      return { col: '', dir: null }
    })
  }, [])

  const sorted = [...data].sort((a: any, b: any) => {
    if (!sort.col || !sort.dir) return 0
    const av = a[sort.col] ?? ''
    const bv = b[sort.col] ?? ''
    const cmp = String(av).localeCompare(String(bv), 'es', { numeric: true })
    return sort.dir === 'asc' ? cmp : -cmp
  })

  return { sort, toggleSort, sorted }
}

