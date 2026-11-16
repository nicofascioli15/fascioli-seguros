import { traerTodo } from '@/lib/traerTodo'
import { formatFechaAsamblea } from '@/lib/asambleas'

// Contactos de las personas registradas en las asambleas (nombre, teléfono, edificio y apto).
export type Contacto = {
  edificio_id: string | null; edificio: string; codigo: string; unidad: string; nombre: string; telefono: string
  caracter: 'Propietario' | 'Por poder'; ultima: string; asambleas: number
}

export async function traerContactos(supabase: any, edificioId?: string): Promise<Contacto[]> {
  const rows = await traerTodo<any>(() => {
    let qy = supabase.from('asamblea_unidades')
      .select('unidad, propietario, propietario_tel, apoderado, apoderado_tel, por_poder, asambleas!inner(fecha, edificio_id, asam_edificios(nombre, codigo))')
    if (edificioId) qy = qy.eq('asambleas.edificio_id', edificioId)
    return qy.order('id')
  })
  // Un contacto por edificio + apto + persona; se queda con la asamblea más reciente
  const m = new Map<string, Contacto>()
  rows.forEach((r: any) => {
    const nombre = ((r.por_poder ? r.apoderado : r.propietario) || '').trim()
    const tel = ((r.por_poder ? r.apoderado_tel : r.propietario_tel) || '').trim()
    if (!nombre && !tel) return
    const ed = r.asambleas?.asam_edificios
    const k = `${r.asambleas?.edificio_id}|${r.unidad}|${nombre.toLowerCase()}|${tel.replace(/\D/g, '')}`
    const fecha = r.asambleas?.fecha || ''
    const prev = m.get(k)
    if (prev) { prev.asambleas++; if (fecha > prev.ultima) prev.ultima = fecha; return }
    m.set(k, { edificio_id: r.asambleas?.edificio_id || null, edificio: ed?.nombre || '—', codigo: ed?.codigo || '', unidad: r.unidad, nombre, telefono: tel, caracter: r.por_poder ? 'Por poder' : 'Propietario', ultima: fecha, asambleas: 1 })
  })
  return Array.from(m.values()).sort((a, b) => a.edificio.localeCompare(b.edificio) || a.unidad.localeCompare(b.unidad, 'es', { numeric: true }))
}

export async function exportarContactosExcel(lista: Contacto[], nombreArchivo: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(lista.map(f => ({
    'Edificio': f.edificio, 'Código': f.codigo, 'Unidad': f.unidad, 'Nombre': f.nombre, 'Teléfono': f.telefono,
    'Carácter': f.caracter, 'Última asamblea': formatFechaAsamblea(f.ultima), 'Asambleas': f.asambleas,
  })))
  ws['!cols'] = [{ wch: 32 }, { wch: 8 }, { wch: 9 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 15 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contactos')
  XLSX.writeFile(wb, `${nombreArchivo.replace(/[\\/:*?"<>|]/g, '')}.xlsx`)
}
