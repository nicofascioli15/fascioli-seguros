// Ficha completa de una obra en PDF (jsPDF + autotable, mismo estilo que el resto de los exports).
import type { ObraCompleta } from '@/lib/obrasData'
import { formatFecha, formatPeriodo, formatMonto, TIPOS_OBRA, TIPOS_PAGO, textoGarantia, PLAZO_CIERRE_BPS_DIAS, hoyLocal } from '@/lib/obrasConfig'

type Extra = {
  direccion?: string | null
  empresaDatos?: { rut?: string | null; contacto?: string | null; tel?: string | null; email?: string | null } | null
  documentos: { nombre: string; tipo: string | null; created_at: string }[]
  comentarios: { fecha: string; texto: string }[]
}

const NAVY: [number, number, number] = [15, 30, 53]
const GOLD: [number, number, number] = [201, 168, 76]
const VERDE: [number, number, number] = [46, 150, 104]
const ROJO: [number, number, number] = [220, 38, 38]
const GRIS: [number, number, number] = [110, 120, 135]

// Las fuentes estándar de PDF no traen algunos caracteres: se reemplazan por equivalentes seguros.
function t(s: any): string {
  return String(s ?? '').replace(/[—–]/g, '-').replace(/→/g, '->').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/≤/g, '<=').replace(/≥/g, '>=')
}

export async function imprimirObraPDF(obra: ObraCompleta, extra: Extra) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 36
  const m = obra.moneda
  let y = 0

  const finTabla = () => (doc as any).lastAutoTable.finalY as number
  const espacio = (necesario: number) => { if (y + necesario > H - 50) { doc.addPage(); y = 50 } }

  function seccion(titulo: string) {
    espacio(60)
    y += 18
    doc.setFillColor(...GOLD)
    doc.rect(M, y - 10, 3, 14, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY)
    doc.text(t(titulo), M + 10, y + 1)
    y += 12
  }

  function claveValor(filas: [string, string][]) {
    autoTable(doc, {
      startY: y,
      body: filas.map(([k, v]) => [t(k), t(v || '-')]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 6, right: 6 }, font: 'helvetica', textColor: [30, 30, 30] },
      columnStyles: { 0: { cellWidth: 175, fontStyle: 'bold', textColor: GRIS } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: M, right: M },
    })
    y = finTabla() + 4
  }

  function tabla(head: string[], body: any[][], opts: any = {}) {
    autoTable(doc, {
      startY: y,
      head: [head.map(t)],
      body: body.map(r => r.map(c => (typeof c === 'object' && c !== null ? { ...c, content: t(c.content) } : t(c)))),
      styles: { fontSize: 8.5, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: M, right: M },
      ...opts,
    })
    y = finTabla() + 4
  }

  function vacio(txt: string) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...GRIS)
    doc.text(t(txt), M + 6, y + 8)
    y += 16
  }

  function barra(pct: number, color: [number, number, number], etiqueta: string) {
    espacio(30)
    const ancho = W - 2 * M
    doc.setFillColor(230, 234, 240); doc.roundedRect(M, y + 4, ancho, 8, 4, 4, 'F')
    const p = Math.max(0, Math.min(1, pct))
    if (p > 0) { doc.setFillColor(...color); doc.roundedRect(M, y + 4, Math.max(8, ancho * p), 8, 4, 4, 'F') }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS)
    doc.text(t(etiqueta), M, y + 24)
    y += 30
  }

  // ── Encabezado ──
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 64, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('FASCIOLI', M, 28)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('GASTOS COMUNES · VENTAS · ALQUILERES', M, 40)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Ficha de obra', W - M, 28, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Generado el ${formatFecha(hoyLocal())}`, W - M, 42, { align: 'right' })

  y = 94
  doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  const tituloLineas = doc.splitTextToSize(t(obra.titulo), W - 2 * M - 130)
  doc.text(tituloLineas, M, y)
  // Situación
  const cerrada = obra.cerrada
  const col: [number, number, number] = cerrada ? VERDE : obra.situacion.cls === 'badge-danger' ? ROJO : obra.situacion.cls === 'badge-warning' ? [217, 119, 6] : GOLD
  doc.setFontSize(9)
  const sit = t(obra.situacion.label)
  const sw = doc.getTextWidth(sit) + 16
  doc.setFillColor(...col); doc.roundedRect(W - M - sw, y - 13, sw, 18, 9, 9, 'F')
  doc.setTextColor(255, 255, 255); doc.text(sit, W - M - sw / 2, y - 1, { align: 'center' })
  y += (tituloLineas.length - 1) * 20 + 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GOLD)
  doc.text(t(`${obra.edificio}${extra.direccion ? ` - ${extra.direccion}` : ''}`), M, y)
  y += 8

  // ── Datos generales ──
  const tipoLabel = TIPOS_OBRA.find(x => x.value === obra.tipo_obra)?.label || obra.tipo_obra
  const aNombre = obra.titular_bps === 'empresa' || obra.tipo_obra === 'menor_cuantia' ? 'La empresa' : 'El edificio'
  seccion('Datos de la obra')
  claveValor([
    ['Edificio', obra.edificio],
    ['Empresa', obra.empresa || 'Sin empresa'],
    ...(extra.empresaDatos?.rut ? [['RUT empresa', extra.empresaDatos.rut] as [string, string]] : []),
    ...(extra.empresaDatos?.contacto || extra.empresaDatos?.tel || extra.empresaDatos?.email
      ? [['Contacto empresa', [extra.empresaDatos?.contacto, extra.empresaDatos?.tel, extra.empresaDatos?.email].filter(Boolean).join(' · ')] as [string, string]] : []),
    ['Tipo de obra', tipoLabel],
    ['Obra a nombre de', aNombre],
    ['El cierre (F9) lo hace', obra.cierre.responsable === 'empresa' ? 'La empresa' : 'La administración'],
    ['N° de obra BPS', obra.nro_obra_bps || '-'],
    ['Inscripción BPS', formatFecha(obra.fecha_inscripcion_bps)],
    ['Firma del contrato', formatFecha(obra.fecha_contrato)],
    ['Inicio', formatFecha(obra.fecha_inicio)],
    ['Fin previsto', formatFecha(obra.fecha_fin_prevista)],
    ['Fin real', formatFecha(obra.fecha_fin_real)],
    ['Precio total', obra.precio_total != null ? formatMonto(obra.precio_total, m) : '-'],
    ['Garantía', textoGarantia(obra.garantia_meses, obra.garantia_unidad)],
    ...(obra.descripcion ? [['Descripción', obra.descripcion] as [string, string]] : []),
    ...(obra.nota ? [['Nota', obra.nota] as [string, string]] : []),
  ])

  // ── Pagos ──
  const rp = obra.rp
  seccion('Plan de pagos')
  claveValor([
    ['Total del plan', formatMonto(rp.totalPlan, m)],
    ['Pagado', formatMonto(rp.totalPagado, m)],
    ['Saldo', formatMonto(rp.saldo, m)],
    ...(rp.diferenciaPlan !== 0 && obra.pagos.length ? [['Diferencia con el precio', formatMonto(rp.diferenciaPlan, m)] as [string, string]] : []),
  ])
  if (obra.pagos.length) {
    barra(rp.pctPagado, VERDE, `${Math.round(rp.pctPagado * 100)}% pagado · ${obra.pagos.filter(p => p.pagado).length} de ${obra.pagos.length} pagos`)
    const hoy = hoyLocal()
    tabla(['#', 'Concepto', 'Tipo', 'Monto', 'Vence', 'Estado', 'Pago', 'Método / Ref.'],
      obra.pagos.map((p, i) => {
        const atrasado = !p.pagado && p.fecha_prevista && p.fecha_prevista < hoy
        return [
          i + 1,
          p.concepto + (p.condicion ? `\n(${p.condicion})` : ''),
          TIPOS_PAGO.find(x => x.value === p.tipo)?.label || p.tipo,
          { content: formatMonto(p.monto, m), styles: { halign: 'right' } },
          formatFecha(p.fecha_prevista),
          { content: p.pagado ? 'Pagado' : atrasado ? 'Atrasado' : 'Pendiente', styles: { textColor: p.pagado ? VERDE : atrasado ? ROJO : [180, 120, 0], fontStyle: 'bold' } },
          p.pagado ? formatFecha(p.fecha_pago) : '-',
          [p.metodo, p.comprobante].filter(Boolean).join(' · ') || '-',
        ]
      }),
      { columnStyles: { 0: { cellWidth: 20 }, 3: { halign: 'right' } } })
  } else vacio('Todavía no hay plan de pagos cargado.')

  // ── Leyes sociales ──
  const rl = obra.rl
  seccion('Leyes sociales (BPS)')
  claveValor([
    ['Tope contractual', rl.tope != null ? formatMonto(rl.tope, 'UYU') : 'Sin tope'],
    ['Total facturado BPS', formatMonto(rl.totalFacturado, 'UYU')],
    ['A cargo del edificio', formatMonto(rl.totalACargoEdificio, 'UYU')],
    ...(rl.excedente > 0 ? [['Excedente (a cargo de la empresa)', formatMonto(rl.excedente, 'UYU')] as [string, string]] : []),
    ...(rl.disponible != null && rl.disponible > 0 ? [['Disponible hasta el tope', formatMonto(rl.disponible, 'UYU')] as [string, string]] : []),
    ['Pagado', formatMonto(rl.totalPagado, 'UYU')],
    ['Pendiente de pago', formatMonto(rl.pendientePago, 'UYU')],
  ])
  if (rl.pctTope != null) barra(rl.pctTope, rl.alerta === 'excedido' ? ROJO : rl.alerta === 'cerca' ? [217, 119, 6] : VERDE, `${Math.round(rl.pctTope * 100)}% del tope usado`)
  if (rl.detalle.length) {
    tabla(['Período', 'Monto', 'Acumulado', 'A cargo edificio', 'Excedente', 'Estado', 'Pago', 'Método / Ref.'],
      rl.detalle.map(l => [
        formatPeriodo(l.periodo),
        formatMonto(l.monto, 'UYU'),
        formatMonto(l.acumulado, 'UYU'),
        formatMonto(l.aCargoEdificio, 'UYU'),
        l.excedente > 0 ? { content: formatMonto(l.excedente, 'UYU'), styles: { textColor: ROJO } } : '-',
        { content: l.pagado ? 'Pagado' : 'Pendiente', styles: { textColor: l.pagado ? VERDE : [180, 120, 0], fontStyle: 'bold' } },
        l.pagado ? formatFecha(l.fecha_pago) : '-',
        [l.metodo, l.comprobante, l.nota].filter(Boolean).join(' · ') || '-',
      ]),
      { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } } })
  } else vacio('Todavía no hay facturas de BPS cargadas.')

  // ── Cierre BPS y garantía ──
  const c = obra.cierre
  seccion('Cierre de obra en BPS (F9)')
  claveValor([
    ['Estado', obra.cierre_bps_estado],
    ['Lo hace', c.responsable === 'empresa' ? 'La empresa' : 'La administración'],
    ['Obra terminada', formatFecha(obra.fecha_fin_real)],
    ...(c.limite ? [[`Plazo (${PLAZO_CIERRE_BPS_DIAS} días)`, `${formatFecha(c.limite)}${c.vencido ? ` - VENCIDO hace ${Math.abs(c.dias!)} días` : c.pendiente ? ` (${c.dias} días)` : ''}`] as [string, string]] : []),
    ...(obra.cierre_bps_fecha ? [['Presentado', formatFecha(obra.cierre_bps_fecha)] as [string, string]] : []),
  ])

  const g = obra.garantia
  seccion('Garantía')
  claveValor([
    ['Plazo', `${textoGarantia(obra.garantia_meses, obra.garantia_unidad)} desde ${obra.fecha_contrato ? 'la firma del contrato' : 'el fin de la obra'}`],
    ['Cubre hasta', g.hasta ? formatFecha(g.hasta) : '-'],
    ['Estado', g.estado === 'sin_fin' ? 'Sin fecha de inicio' : g.estado === 'vencida' ? 'Vencida' : g.porVencer ? `Por vencer (${g.dias} días)` : `Vigente (${g.dias} días)`],
  ])

  // ── Documentos ──
  seccion('Documentos')
  if (extra.documentos.length) {
    tabla(['Documento', 'Tipo', 'Subido'], extra.documentos.map(d => [d.nombre, d.tipo || '-', formatFecha(d.created_at)]), { columnStyles: { 2: { cellWidth: 70 } } })
  } else vacio('Sin documentos adjuntos.')

  // ── Comentarios ──
  seccion('Comentarios')
  if (extra.comentarios.length) {
    tabla(['Fecha', 'Comentario'], extra.comentarios.map(cm => [formatFecha(cm.fecha), cm.texto]), { columnStyles: { 0: { cellWidth: 70 } } })
  } else vacio('Sin comentarios.')

  // ── Pie ──
  const n = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150)
    doc.text(t(`${obra.titulo} - ${obra.edificio}`), M, H - 18)
    doc.text(`Página ${i} de ${n}`, W - M, H - 18, { align: 'right' })
  }

  const archivo = `Obra - ${obra.edificio} - ${obra.titulo}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 120)
  doc.save(`${archivo}.pdf`)
}
