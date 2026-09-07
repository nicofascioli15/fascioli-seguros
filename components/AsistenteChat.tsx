'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

type Mensaje = { role: 'user' | 'assistant'; texto: string; accion?: boolean }

export default function AsistenteChat() {
  const [open, setOpen] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, open])

  async function enviar() {
    const texto = input.trim()
    if (!texto || loading) return
    setInput('')
    const nuevos: Mensaje[] = [...mensajes, { role: 'user', texto }]
    setMensajes(nuevos)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const historial = nuevos.map(m => ({ role: m.role, content: m.texto }))
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: historial }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMensajes(m => [...m, { role: 'assistant', texto: data.error || 'Hubo un error, probá de nuevo.' }])
      } else {
        setMensajes(m => [...m, { role: 'assistant', texto: data.respuesta || '(sin respuesta)' }])
      }
    } catch {
      setMensajes(m => [...m, { role: 'assistant', texto: 'No se pudo conectar con el asistente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Asistente virtual"
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 54, height: 54, borderRadius: '50%',
          background: 'var(--navy)', color: 'var(--gold)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(15,30,53,.25)',
          zIndex: 1000,
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, width: 360, maxWidth: 'calc(100vw - 32px)', height: 480, maxHeight: 'calc(100vh - 130px)',
          background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, boxShadow: '0 8px 32px rgba(15,30,53,.2)',
          display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-soft)', fontWeight: 700, color: 'var(--text-main)', fontSize: 14 }}>
            Asistente Fascioli
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mensajes.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                Preguntame cosas como "¿qué pólizas vencen este mes?", "buscame el cliente Marsala" o "cuotas pendientes de tal cliente".
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'var(--navy)' : 'var(--bg-card-alt)',
                color: m.role === 'user' ? 'var(--white)' : 'var(--text-main)',
                padding: '8px 12px', borderRadius: 10, maxWidth: '85%', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {m.texto}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Loader2 size={14} className="spin" /> pensando...
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border-soft)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') enviar() }}
              placeholder="Escribí tu consulta..."
              style={{ flex: 1, border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', fontSize: 13.5, background: 'var(--bg-page)', color: 'var(--text-main)' }}
            />
            <button onClick={enviar} disabled={loading || !input.trim()} className="btn-primary" style={{ padding: '8px 12px' }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .spin { animation: asistente-spin 1s linear infinite; }
        @keyframes asistente-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
