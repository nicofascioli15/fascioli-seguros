// Toast global — se puede llamar desde cualquier lado (componentes, o funciones
// sueltas como lib/files.ts) sin necesitar estado propio en cada pantalla.
// ToastHost.tsx (montado una sola vez en app/layout.tsx) se suscribe a esto y
// dibuja los mensajes con el estilo de la app en vez del alert() nativo del navegador.

export type ToastTone = 'info' | 'error' | 'success'
export type ToastItem = { id: number; text: string; tone: ToastTone }

type Listener = (items: ToastItem[]) => void

let items: ToastItem[] = []
let listeners: Listener[] = []
let contador = 0

function emitir() {
  listeners.forEach(l => l(items))
}

export function showToast(text: string, tone: ToastTone = 'info', duracionMs = 4500) {
  const id = ++contador
  items = [...items, { id, text, tone }]
  emitir()
  setTimeout(() => {
    items = items.filter(i => i.id !== id)
    emitir()
  }, duracionMs)
}

export function subscribeToast(fn: Listener): () => void {
  listeners.push(fn)
  fn(items)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
