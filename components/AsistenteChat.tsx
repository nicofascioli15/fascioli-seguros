'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { descargarDocumento } from '@/lib/files'
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2, Sparkles, FileText, Trash2 } from 'lucide-react'

type DocumentoGrupo = { cliente: string; cliente_id: string; documentos: { id: string; nombre: string; tipo: string | null; storage_path: string }[] }
type Mensaje = { role: 'user' | 'assistant'; texto: string; documentos?: DocumentoGrupo[] }

const MAX_CONTEXTO = 12 // cuántos mensajes recientes se le mandan al modelo como contexto (no todo el historial guardado, para no gastar de más)

export default function AsistenteChat() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historialCargado, setHistorialCargado] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, open])

  useEffect(() => {
    if (sessionStorage.getItem('asistente_tooltip_visto')) return
    const mostrar = setTimeout(() => setTooltipVisible(true), 1200)
    const ocultar = setTimeout(() => cerrarTooltip(), 9000)
    return () => { clearTimeout(mostrar); clearTimeout(ocultar) }
  }, [])

  // Carga el historial guardado la primera vez que se abre el chat.
  useEffect(() => {
    if (!open || historialCargado) return
    setHistorialCargado(true)
    ;(async () => {
      const { data } = await supabase.from('asistente_mensajes').select('role, texto, documentos').order('created_at', { ascending: true }).limit(60)
      if (data && data.length > 0) {
        setMensajes(data.map((m: any) => ({ role: m.role, texto: m.texto, documentos: m.documentos || undefined })))
      }
    })()
  }, [open, historialCargado, supabase])

  function cerrarTooltip() {
    setTooltipVisible(false)
    sessionStorage.setItem('asistente_tooltip_visto', '1')
  }

  function toggleOpen() {
    if (!open) cerrarTooltip()
    setOpen(o => !o)
  }

  function guardarMensaje(m: Mensaje) {
    supabase.from('asistente_mensajes').insert([{ role: m.role, texto: m.texto, documentos: m.documentos || null }]).then(({ error }) => {
      if (error) console.warn('No se pudo guardar el mensaje del asistente:', error.message)
    })
  }

  async function vaciarHistorial() {
    if (!window.confirm('¿Vaciar todo el historial de conversación con el asistente?')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('asistente_mensajes').delete().eq('usuario_id', user.id)
    setMensajes([])
  }

  async function enviar() {
    const texto = input.trim()
    if (!texto || loading) return
    setInput('')
    const mensajeUsuario: Mensaje = { role: 'user', texto }
    const nuevos: Mensaje[] = [...mensajes, mensajeUsuario]
    setMensajes(nuevos)
    guardarMensaje(mensajeUsuario)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const historial = nuevos.slice(-MAX_CONTEXTO).map(m => ({ role: m.role, content: m.texto }))
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: historial }),
      })
      const data = await res.json()
      const mensajeAsistente: Mensaje = !res.ok
        ? { role: 'assistant', texto: data.error || 'Hubo un error, probá de nuevo.' }
        : { role: 'assistant', texto: data.respuesta || '(sin respuesta)', documentos: data.documentos?.length > 0 ? data.documentos : undefined }
      setMensajes(m => [...m, mensajeAsistente])
      guardarMensaje(mensajeAsistente)
    } catch {
      const mensajeError: Mensaje = { role: 'assistant', texto: 'No se pudo conectar con el asistente.' }
      setMensajes(m => [...m, mensajeError])
      guardarMensaje(mensajeError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {tooltipVisible && !open && (
        <div style={{
          position: 'fixed', bottom: 32, right: 88, maxWidth: 230,
          background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12,
          padding: '10px 12px', boxShadow: '0 4px 16px rgba(15,30,53,.18)', zIndex: 1000,
          display: 'flex', gap: 8, alignItems: 'flex-start', animation: 'asistente-fade-in .25s ease',
        }}>
          <Sparkles size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1, lineHeight: 1.4, fontSize: 12.5, color: 'var(--text-main)' }}>
            Preguntame por vencimientos, clientes, cuotas o siniestros
          </span>
          <button onClick={cerrarTooltip} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      )}

      <button
        onClick={toggleOpen}
        aria-label="Asistente virtual"
        className={`asistente-fab${open ? ' is-open' : ''}`}
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
        <div className={`asistente-panel${expanded ? ' expanded' : ''}`} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-soft)', boxShadow: '0 8px 32px rgba(15,30,53,.2)',
          display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden',
        }}>
          <div className="asistente-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Sparkles size={15} color="var(--gold)" />
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 14 }}>Asistente Fascioli</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={vaciarHistorial} aria-label="Vaciar historial" className="asistente-clear-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                <Trash2 size={15} />
              </button>
              <button onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Achicar' : 'Agrandar'} className="asistente-expand-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="asistente-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'none' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mensajes.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                Preguntame cosas como "¿qué pólizas vencen este mes?", "buscame el cliente Marsala", "cuotas pendientes de tal cliente" o "dame los documentos de tal cliente".
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}>
                <div style={{
                  background: m.role === 'user' ? 'var(--navy)' : 'var(--bg-card-alt)',
                  color: m.role === 'user' ? 'var(--white)' : 'var(--text-main)',
                  padding: '8px 12px', borderRadius: 10, maxWidth: '85%', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>
                  {m.texto}
                </div>
                {m.documentos?.map(grupo => (
                  <div key={grupo.cliente_id} style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: '90%' }}>
                    {grupo.documentos.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => descargarDocumento(supabase, doc.storage_path)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7, textAlign: 'left',
                          background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 8,
                          padding: '7px 10px', fontSize: 12.5, color: 'var(--text-main)', cursor: 'pointer',
                        }}
                      >
                        <FileText size={14} color="var(--gold)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Loader2 size={14} className="spin" /> pensando...
              </div>
            )}
          </div>

          <div className="asistente-input-row" style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border-soft)' }}>
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
        @keyframes asistente-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        .asistente-panel {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 360px;
          height: 480px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 130px);
          border-radius: 14px;
          transition: width .2s ease, height .2s ease;
        }
        .asistente-panel.expanded {
          width: 560px;
          height: 720px;
        }

        /* En celular: el chat pasa a ocupar toda la pantalla, usando dvh
           (altura "dinámica") en vez de vh fijo, así se re-acomoda solo
           cuando aparece el teclado en vez de saltar hacia arriba. */
        @media (max-width: 640px) {
          .asistente-panel, .asistente-panel.expanded {
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100dvh;
            max-width: 100%;
            max-height: 100dvh;
            border-radius: 0;
          }
          .asistente-fab.is-open { display: none; }
          .asistente-close-btn { display: flex !important; }
          .asistente-header { padding-top: calc(12px + env(safe-area-inset-top)) !important; }
          .asistente-input-row { padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
    </>
  )
}
