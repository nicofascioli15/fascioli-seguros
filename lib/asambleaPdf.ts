// Acta de votaciones de una asamblea en PDF: asistentes (presentes / por poder) y cada moción con su resultado y votos nominales.
import type { AsambleaCompleta } from '@/lib/asambleasData'
import { calcularResultado, quorum, votante, votoLabel, mayoriaLabel, baseLabel, formatFechaAsamblea, MODOS_CONTEO } from '@/lib/asambleas'
import { hoyLocal } from '@/lib/obrasConfig'

const NAVY: [number, number, number] = [15, 30, 53]
const GOLD: [number, number, number] = [201, 168, 76]
const VERDE: [number, number, number] = [22, 128, 61]
const ROJO: [number, number, number] = [185, 28, 28]
const GRIS: [number, number, number] = [110, 120, 135]

const t = (s: any) => String(s ?? '').replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")

export async function imprimirActaPDF(d: AsambleaCompleta) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36
  const a = d.asamblea
  const usaCoef = a.modo_conteo !== 'unidad'
  let y = 0
  const fin = () => (doc as any).lastAutoTable.finalY as number
  const espacio = (n: number) => { if (y + n > H - 50) { doc.addPage(); y = 50 } }

  function seccion(titulo: string) {
    espacio(60); y += 18
    doc.setFillColor(...GOLD); doc.rect(M, y - 10, 3, 14, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY); doc.text(t(titulo), M + 10, y + 1)
    y += 12
  }
  function kv(filas: [string, string][]) {
    autoTable(doc, { startY: y, body: filas.map(([k, v]) => [t(k), t(v || '-')]), theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 6, right: 6 }, textColor: [30, 30, 30] },
      columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold', textColor: GRIS } }, alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { left: M, right: M } })
    y = fin() + 4
  }
  function tabla(head: string[], body: any[][], opts: any = {}) {
    autoTable(doc, { startY: y, head: [head.map(t)], body: body.map(r => r.map(c => (c && typeof c === 'object' ? { ...c, content: t(c.content) } : t(c)))),
      styles: { fontSize: 8.5, cellPadding: 4 }, headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { left: M, right: M }, ...opts })
    y = fin() + 4
  }

  // Encabezado
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 64, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('FASCIOLI', M, 28)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('GASTOS COMUNES · VENTAS · ALQUILERES', M, 40)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Acta de votaciones', W - M, 28, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Generado el ${formatFechaAsamblea(hoyLocal())}`, W - M, 42, { align: 'right' })

  y = 96
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(t(`Asamblea ${a.tipo.toLowerCase()} - ${d.edificio}`), M, y)
  y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GOLD)
  doc.text(t(`${formatFechaAsamblea(a.fecha)} · ${a.convocatoria} convocatoria${a.lugar ? ` · ${a.lugar}` : ''}${d.direccion ? ` · ${d.direccion}` : ''}`), M, y)
  y += 6

  const q = quorum(a, d.unidades)
  seccion('Asistencia y quórum')
  kv([
    ['Conteo de votos', MODOS_CONTEO.find(m => m.value === a.modo_conteo)?.label || a.modo_conteo],
    ['Unidades acreditadas', `${q.presentes}${a.total_unidades ? ` de ${a.total_unidades} (${Math.round((q.pctUnidades || 0) * 100)}%)` : ''}`],
    ['En persona / por poder', `${q.presentes - q.porPoder} / ${q.porPoder}`],
    ...(usaCoef ? [['Coeficiente presente', `${q.coef}%${a.total_coeficiente ? ` de ${a.total_coeficiente}%` : ''}`] as [string, string]] : []),
    ...(a.notas ? [['Notas', a.notas] as [string, string]] : []),
  ])
  tabla(['Unidad', 'Propietario', ...(usaCoef ? ['Coef.'] : []), 'Asistencia', 'Votó'],
    d.unidades.map(u => [u.unidad, u.propietario || '-', ...(usaCoef ? [u.coeficiente != null ? `${u.coeficiente}%` : '-'] : []), u.por_poder ? 'Por poder' : 'Presente', votante(u)]),
    { columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } } })

  d.mociones.forEach((m, i) => {
    const votos = d.votos.filter(v => v.mocion_id === m.id)
    const r = calcularResultado(a, m, d.unidades, votos)
    const votoDe = new Map(votos.map(v => [v.unidad_id, v.voto]))
    seccion(`Moción ${i + 1}: ${m.titulo}`)
    const estado = m.estado === 'cerrada' ? (m.aprobada ? 'APROBADA' : 'RECHAZADA') : m.estado === 'votando' ? 'Votación abierta (sin cerrar)' : 'No se votó'
    kv([
      ...(m.descripcion ? [['Detalle', m.descripcion] as [string, string]] : []),
      ['Mayoría requerida', `${mayoriaLabel(m.mayoria)}${m.mayoria !== 'simple' ? ` - ${baseLabel(m.base).toLowerCase()}` : ''} (hace falta ${r.necesario})`],
      ...(r.usaUnidades ? [['Unidades', `${r.unidades.si} a favor · ${r.unidades.no} en contra · ${r.unidades.abstencion} abstenciones${r.unidades.sinVotar ? ` · ${r.unidades.sinVotar} sin votar` : ''}`] as [string, string]] : []),
      ...(r.usaCoeficiente ? [['Coeficiente', `${r.coeficiente.si}% a favor · ${r.coeficiente.no}% en contra · ${r.coeficiente.abstencion}% abstenciones`] as [string, string]] : []),
    ])
    // Resultado destacado
    espacio(26)
    const col = m.estado === 'cerrada' ? (m.aprobada ? VERDE : ROJO) : GRIS
    doc.setFillColor(...col); doc.roundedRect(M, y + 2, 170, 20, 5, 5, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(t(estado), M + 85, y + 15.5, { align: 'center' })
    y += 28
    if (m.estado !== 'pendiente') {
      tabla(['Unidad', 'Votó', 'Voto'], d.unidades.map(u => {
        const v = votoDe.get(u.id)
        return [u.unidad, `${votante(u)}${u.por_poder ? ' (por poder)' : ''}`, v ? { content: votoLabel(v), styles: { fontStyle: 'bold', textColor: v === 'si' ? VERDE : v === 'no' ? ROJO : GRIS } } : 'Sin votar']
      }), { columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 2: { cellWidth: 90 } } })
    }
  })

  // Firmas
  espacio(90); y += 50
  doc.setDrawColor(...GRIS); doc.setLineWidth(.6)
  const ancho = (W - 2 * M - 40) / 2
  doc.line(M, y, M + ancho, y); doc.line(M + ancho + 40, y, W - M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS)
  doc.text('Presidente de la asamblea', M + ancho / 2, y + 13, { align: 'center' })
  doc.text('Secretario / Administración', M + ancho + 40 + ancho / 2, y + 13, { align: 'center' })

  const n = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150)
    doc.text(t(`Asamblea ${d.edificio} - ${formatFechaAsamblea(a.fecha)}`), M, H - 18)
    doc.text(`Página ${i} de ${n}`, W - M, H - 18, { align: 'right' })
  }
  doc.save(`Acta asamblea - ${d.edificio.replace(/[\\/:*?"<>|]/g, '')} - ${a.fecha}.pdf`)
}
