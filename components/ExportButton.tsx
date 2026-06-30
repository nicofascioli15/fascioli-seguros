'use client'
import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText as FileTextIcon, Loader2 } from 'lucide-react'
import { exportarPDF, exportarExcel, Columna } from '@/lib/export'

type Props = {
  titulo: string
  subtitulo?: string
  columnas: Columna[]
  filas: Record<string, any>[]
  filename: string
  disabled?: boolean
}

export default function ExportButton({ titulo, subtitulo, columnas, filas, filename, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handlePDF() {
    setExporting('pdf')
    try { await exportarPDF({ titulo, subtitulo, columnas, filas, filename }) }
    finally { setExporting(null); setOpen(false) }
  }

  async function handleExcel() {
    setExporting('excel')
    try { await exportarExcel({ titulo, columnas, filas, filename }) }
    finally { setExporting(null); setOpen(false) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn-outline"
        onClick={() => setOpen(o => !o)}
        disabled={disabled || filas.length === 0}
        style={{ opacity: filas.length === 0 ? 0.5 : 1 }}
      >
        <Download size={15} /> Exportar
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
          background: 'white', borderRadius: 10, border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(15,30,53,.15)', overflow: 'hidden', minWidth: 180,
        }}>
          <button
            onClick={handlePDF}
            disabled={exporting !== null}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--navy)', fontFamily: 'inherit' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F4F7FB')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            {exporting === 'pdf' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileTextIcon size={15} color="var(--danger)" />}
            Descargar PDF
          </button>
          <button
            onClick={handleExcel}
            disabled={exporting !== null}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--navy)', fontFamily: 'inherit', borderTop: '1px solid var(--border)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F4F7FB')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            {exporting === 'excel' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileSpreadsheet size={15} color="#1A7A4E" />}
            Descargar Excel
          </button>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

