// Lectura de los archivos que exporta el sistema de gastos comunes (separados por ";", en Latin-1):
//   edificios: CODIGO;NOMBRE;DIRECCION
//   torres:    CODIGO_EDIF;CODIGO_TORRE;NOMBRE          (NINGUNA / vacío = el edificio no tiene torres)
//   unidades:  CODIGO_EDIF;TORRE;UNIDAD;TIPO;NOMBRE;TEL;EMAIL
//              TIPO: A = propietario que vive en la unidad · P = propietario · I = inquilino
// Los inquilinos (I) NO se importan: en la asamblea votan los propietarios (el inquilino solo puede ir con poder).

export type EdificioArchivo = { codigo: string; nombre: string; direccion: string }
export type TorreArchivo = { edificio: string; codigo: string; nombre: string }
export type UnidadArchivo = {
  edificio: string; torre: string; unidad: string
  propietario: string; propietario_tel: string; propietario_email: string
}

// Los archivos vienen en Latin-1 / Windows-1252 (tildes y Ñ). Si ya vinieran en UTF-8 también funciona.
export async function leerArchivo(f: File): Promise<string> {
  const buf = await f.arrayBuffer()
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  if (!utf8.includes('�')) return utf8
  return new TextDecoder('windows-1252').decode(buf)
}

// Algunos nombres traen entidades HTML (Gonz&#xE1;lez). Se resuelven ANTES de separar por ";",
// porque el ";" de la entidad rompería las columnas.
export function decodificarEntidades(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

const limpio = (s: string | undefined) => (s || '').replace(/\s+/g, ' ').trim()

function lineas(texto: string): string[][] {
  return decodificarEntidades(texto).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(';'))
}

export function parseEdificios(texto: string): EdificioArchivo[] {
  return lineas(texto).map(c => ({ codigo: limpio(c[0]).toUpperCase(), nombre: limpio(c[1]), direccion: limpio(c.slice(2).join(' ')) }))
    .filter(e => e.codigo && e.nombre)
}

export function parseTorres(texto: string): TorreArchivo[] {
  return lineas(texto).map(c => ({ edificio: limpio(c[0]).toUpperCase(), codigo: limpio(c[1]).toUpperCase(), nombre: limpio(c.slice(2).join(' ')) }))
    .filter(t => t.edificio && t.codigo && t.nombre.toUpperCase() !== 'NINGUNA')
}

// Después de NOMBRE pueden venir columnas de más (dos teléfonos, dos mails, un segundo nombre):
// se reparten según lo que parecen.
function persona(resto: string[]) {
  const nombre: string[] = [], tel: string[] = [], email: string[] = []
  resto.map(limpio).filter(Boolean).forEach((v, i) => {
    if (v.includes('@')) email.push(v)
    else if (/^[\d\s+\-/()]{6,}$/.test(v)) tel.push(v)
    else if (i === 0 || !tel.length) nombre.push(v)
    else nombre.push(v)
  })
  return { nombre: nombre.join(' / '), tel: tel.join(' / '), email: email.join(', ') }
}

export function parseUnidades(texto: string): UnidadArchivo[] {
  const m = new Map<string, UnidadArchivo>()
  lineas(texto).forEach(c => {
    const edificio = limpio(c[0]).toUpperCase(), torre = limpio(c[1]).toUpperCase(), unidad = limpio(c[2])
    const tipo = limpio(c[3]).toUpperCase()
    if (!edificio || !unidad) return
    const k = `${edificio}|${torre}|${unidad}`
    // La unidad se crea igual aunque solo venga el renglón del inquilino, pero sin sus datos.
    if (!m.has(k)) m.set(k, { edificio, torre, unidad, propietario: '', propietario_tel: '', propietario_email: '' })
    if (tipo === 'I') return
    const u = m.get(k)!
    const p = persona(c.slice(4))
    u.propietario = p.nombre || u.propietario; u.propietario_tel = p.tel || u.propietario_tel; u.propietario_email = p.email || u.propietario_email
  })
  return Array.from(m.values())
}

// Para encontrar el edificio ya cargado aunque el nombre esté escrito distinto
// ("EDIFICIO RETAMOSA" = "Retamosa", sin tildes ni signos).
export function normalizarNombre(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\b(edificio|edif|ed|complejo|torre|residencial)\b\.?/g, ' ')
    .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function etiquetaUnidad(u: { torre?: string | null; unidad: string }): string {
  return u.torre ? `${u.torre}-${u.unidad}` : u.unidad
}

// ── Padrón de un edificio de Asambleas (tablas propias: asam_edificios / asam_torres / asam_unidades) ──
export type UnidadPadron = { label: string; torre: string; num: string; propietario: string | null; tel: string | null; coeficiente: number | null }
export type PadronEdificio = { unidades: UnidadPadron[]; torres: { codigo: string; nombre: string | null }[] }

export async function traerPadron(supabase: any, edificioId: string | null): Promise<PadronEdificio> {
  if (!edificioId) return { unidades: [], torres: [] }
  const [{ data: us }, { data: ts }] = await Promise.all([
    supabase.from('asam_unidades').select('torre, unidad, propietario, propietario_tel, coeficiente').eq('edificio_id', edificioId),
    supabase.from('asam_torres').select('codigo, nombre').eq('edificio_id', edificioId),
  ])
  const unidades: UnidadPadron[] = (us || []).map((u: any) => ({ label: etiquetaUnidad(u), torre: u.torre || '', num: u.unidad, propietario: u.propietario, tel: u.propietario_tel, coeficiente: u.coeficiente != null ? Number(u.coeficiente) : null }))
    .sort((a: UnidadPadron, b: UnidadPadron) => a.torre.localeCompare(b.torre) || a.num.localeCompare(b.num, 'es', { numeric: true }))
  const cods = Array.from(new Set(unidades.map(u => u.torre))).filter(Boolean)
  return { unidades, torres: cods.map(c => ({ codigo: c, nombre: (ts || []).find((t: any) => t.codigo === c)?.nombre || null })) }
}
