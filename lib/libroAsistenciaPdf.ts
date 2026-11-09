// Libro de asistencia de una asamblea: cada unidad acreditada con quién firma, teléfono, carácter y la FIRMA
// hecha en la tablet.
import type { AsambleaCompleta } from '@/lib/asambleasData'
import { quorum, votante, formatFechaAsamblea } from '@/lib/asambleas'
import { hoyLocal } from '@/lib/obrasConfig'

const NAVY: [number, number, number] = [15, 30, 53]
const GOLD: [number, number, number] = [201, 168, 76]
const GRIS: [number, number, number] = [110, 120, 135]
const t = (s: any) => String(s ?? '').replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")

async function firmaDataUrl(supabase: any, path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from('documentos').download(path)
    if (error || !data) return null
    return await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => res(null); r.readAsDataURL(data) })
  } catch { return null }
}

export async function imprimirLibroAsistencia(supabase: any, d: AsambleaCompleta) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36
  const a = d.asamblea

  // Firmas (las que se repiten por poderes se bajan una sola vez)
  const paths = Array.from(new Set(d.unidades.map(u => u.firma_path).filter(Boolean) as string[]))
  const imgs = new Map<string, string | null>()
  await Promise.all(paths.map(async p => imgs.set(p, await firmaDataUrl(supabase, p))))

  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 64, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('FASCIOLI', M, 28)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('GASTOS COMUNES · VENTAS · ALQUILERES', M, 40)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Libro de asistencia', W - M, 28, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Generado el ${formatFechaAsamblea(hoyLocal())}`, W - M, 42, { align: 'right' })

  let y = 96
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(17)
  doc.text(t(`Asamblea ${a.tipo.toLowerCase()} - ${d.edificio}`), M, y)
  y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GOLD)
  doc.text(t(`${formatFechaAsamblea(a.fecha)} · ${a.convocatoria} convocatoria${a.lugar ? ` · ${a.lugar}` : ''}${d.direccion ? ` · ${d.direccion}` : ''}`), M, y)
  y += 16
  const q = quorum(a, d.unidades)
  doc.setTextColor(...GRIS); doc.setFontSize(9.5)
  doc.text(t(`Unidades acreditadas: ${q.presentes}${a.total_unidades ? ` de ${a.total_unidades}` : ''} · propietarios presentes: ${q.presentes - q.porPoder} · por poder: ${q.porPoder}`), M, y)
  y += 12

  const FILA = 46
  const filas = d.unidades.map(u => [
    u.unidad,
    votante(u),
    (u.por_poder ? u.apoderado_tel : u.propietario_tel) || '-',
    u.por_poder ? 'Por poder' : 'Propietario',
    '',   // la firma se dibuja como imagen
  ])
  autoTable(doc, {
    startY: y,
    head: [['Unidad', 'Nombre', 'Teléfono', 'Carácter', 'Firma']],
    body: filas.map(r => r.map(t)),
    styles: { fontSize: 9, cellPadding: 5, valign: 'middle', minCellHeight: FILA },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', minCellHeight: 0 },
    columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' }, 2: { cellWidth: 82 }, 3: { cellWidth: 70 }, 4: { cellWidth: 150 } },
    margin: { left: M, right: M },
    didDrawCell: (data: any) => {
      if (data.section !== 'body' || data.column.index !== 4) return
      const u = d.unidades[data.row.index]
      const img = u?.firma_path ? imgs.get(u.firma_path) : null
      if (img) {
        // La firma se guarda apaisada: se ajusta al alto de la celda manteniendo proporción
        const props = doc.getImageProperties(img)
        const ratio = props.width / props.height || 3
        let h = data.cell.height - 6, w = h * ratio
        if (w > data.cell.width - 8) { w = data.cell.width - 8; h = w / ratio }
        doc.addImage(img, 'PNG', data.cell.x + (data.cell.width - w) / 2, data.cell.y + (data.cell.height - h) / 2, w, h)
      } else {
        doc.setFontSize(8); doc.setTextColor(...GRIS)
        doc.text('Sin firma digital', data.cell.x + 6, data.cell.y + data.cell.height / 2 + 3)
      }
    },
  })

  const n = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150)
    doc.text(t(`Libro de asistencia - ${d.edificio} - ${formatFechaAsamblea(a.fecha)}`), M, H - 18)
    doc.text(`Página ${i} de ${n}`, W - M, H - 18, { align: 'right' })
  }
  doc.save(`Libro de asistencia - ${d.edificio.replace(/[\\/:*?"<>|]/g, '')} - ${a.fecha}.pdf`)
}
