// Utilidades de exportación a PDF y Excel
// Usa jsPDF + jsPDF-AutoTable (PDF) y xlsx/SheetJS (Excel)

export type Columna = { header: string; key: string; width?: number }

function formatDateNow(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export async function exportarPDF(opts: {
  titulo: string
  subtitulo?: string
  columnas: Columna[]
  filas: Record<string, any>[]
  filename: string
}) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header con branding
  doc.setFillColor(15, 30, 53) // navy
  doc.rect(0, 0, pageWidth, 64, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FASCIOLI', 32, 28)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('GASTOS COMUNES · VENTAS · ALQUILERES', 32, 40)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.titulo, pageWidth - 32, 26, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado el ${formatDateNow()}`, pageWidth - 32, 40, { align: 'right' })
  if (opts.subtitulo) {
    doc.text(opts.subtitulo, pageWidth - 32, 52, { align: 'right' })
  }

  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 80,
    head: [opts.columnas.map(c => c.header)],
    body: opts.filas.map(row => opts.columnas.map(c => row[c.key] ?? '')),
    styles: { fontSize: 9, cellPadding: 6, font: 'helvetica' },
    headStyles: { fillColor: [15, 30, 53], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 32, right: 32 },
    columnStyles: Object.fromEntries(
      opts.columnas.map((c, i) => [i, c.width ? { cellWidth: c.width } : {}])
    ),
  })

  // Footer con total de filas
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`${opts.filas.length} registros · Página ${i} de ${pageCount}`, 32, doc.internal.pageSize.getHeight() - 16)
  }

  doc.save(opts.filename.endsWith('.pdf') ? opts.filename : `${opts.filename}.pdf`)
}

export async function exportarExcel(opts: {
  titulo: string
  columnas: Columna[]
  filas: Record<string, any>[]
  filename: string
}) {
  const XLSX = await import('xlsx')

  const data = opts.filas.map(row => {
    const obj: Record<string, any> = {}
    opts.columnas.forEach(c => { obj[c.header] = row[c.key] ?? '' })
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(data)

  // Ajustar ancho de columnas
  ws['!cols'] = opts.columnas.map(c => ({ wch: c.width ? Math.round(c.width / 6) : 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, opts.titulo.slice(0, 31))
  XLSX.writeFile(wb, opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`)
}

