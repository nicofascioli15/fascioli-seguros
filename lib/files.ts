// Limpia un nombre de archivo para usarlo como storage key en Supabase.
// Saca acentos/tildes y reemplaza cualquier caracter que no sea letra, número,
// punto o guión por "_". Sin esto, nombres con tildes (ej. "Deja Vú.pdf") o
// paréntesis (ej. "archivo (1).pdf") hacen fallar la subida con "Invalid key".
export function sanitizeFileName(name: string): string {
  const normalizado = name.normalize('NFD')
  const sinAcentos = normalizado.split('').filter(ch => {
    const code = ch.charCodeAt(0)
    return code < 0x0300 || code > 0x036f
  }).join('')
  return sinAcentos.replace(/[^a-zA-Z0-9._-]/g, '_')
}
