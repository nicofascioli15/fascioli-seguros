import { showToast } from '@/lib/toast'

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

// Genera un link de descarga temporal para un archivo del storage y lo abre en una pestaña
// nueva. Importante: la pestaña se abre en blanco ANTES de esperar la respuesta de Supabase,
// no después — si se llama a window.open() recién cuando vuelve el await, varios navegadores
// (Safari sobre todo) ya no lo consideran un gesto directo del usuario y bloquean la pestaña
// en silencio, sin ningún aviso. Así queda "el botón no hace nada" aunque en realidad sí
// funcionó del lado del servidor. También avisa si Supabase no pudo generar el link (por
// ejemplo, porque el archivo ya no existe en el storage) en vez de quedarse mudo.
export async function descargarDocumento(supabase: any, storagePath: string, bucket = 'documentos') {
  const ventana = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60)
  if (error || !data?.signedUrl) {
    ventana?.close()
    showToast(`No se pudo abrir el documento${error ? `: ${error.message}` : ''}. Puede que el archivo ya no exista en el almacenamiento — probá subiéndolo de nuevo.`, 'error')
    return
  }
  if (ventana) ventana.location.href = data.signedUrl
  else window.open(data.signedUrl, '_blank')
}
