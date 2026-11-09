'use client'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

export type FirmaPadRef = { limpiar: () => void; vacia: () => boolean; png: () => Promise<Blob | null> }

// Recuadro para firmar con el lápiz de la tablet (o el dedo / mouse). Tinta oscura sobre blanco, como en papel.
const FirmaPad = forwardRef<FirmaPadRef, { onCambio?: (tieneFirma: boolean) => void; alto?: number }>(function FirmaPad({ onCambio, alto = 220 }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)
  const ultimo = useRef<{ x: number; y: number } | null>(null)
  const trazos = useRef(0)
  const [hayFirma, setHayFirma] = useState(false)

  // Ajusta la resolución real del canvas a la pantalla (para que el trazo salga nítido)
  useEffect(() => {
    const c = canvas.current!
    const ajustar = () => {
      const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
      const copia = trazos.current ? c.toDataURL() : null
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr)
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0F1E35'
      if (copia) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = copia }
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])

  function punto(e: React.PointerEvent) {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function abajo(e: React.PointerEvent) {
    e.preventDefault()
    canvas.current!.setPointerCapture(e.pointerId)
    dibujando.current = true
    ultimo.current = punto(e)
    const ctx = canvas.current!.getContext('2d')!
    ctx.beginPath(); ctx.arc(ultimo.current.x, ultimo.current.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#0F1E35'; ctx.fill()
  }
  function mover(e: React.PointerEvent) {
    if (!dibujando.current || !ultimo.current) return
    e.preventDefault()
    const p = punto(e)
    const ctx = canvas.current!.getContext('2d')!
    // El lápiz manda presión: trazo un poco más grueso al apretar
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure > 0 ? 1.4 + e.pressure * 2.6 : 2.6
    ctx.beginPath(); ctx.moveTo(ultimo.current.x, ultimo.current.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    ultimo.current = p
    trazos.current++
    if (!hayFirma && trazos.current > 4) { setHayFirma(true); onCambio?.(true) }
  }
  function arriba() { dibujando.current = false; ultimo.current = null }

  function limpiar() {
    const c = canvas.current!, ctx = c.getContext('2d')!
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore()
    trazos.current = 0; setHayFirma(false); onCambio?.(false)
  }

  useImperativeHandle(ref, () => ({
    limpiar,
    vacia: () => trazos.current <= 4,
    png: () => new Promise(res => {
      // Se exporta sobre fondo blanco (el canvas es transparente)
      const c = canvas.current!, out = document.createElement('canvas')
      out.width = c.width; out.height = c.height
      const ctx = out.getContext('2d')!
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, out.width, out.height); ctx.drawImage(c, 0, 0)
      out.toBlob(b => res(b), 'image/png')
    }),
  }))

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvas}
        onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba} onPointerLeave={arriba}
        style={{ width: '100%', height: alto, background: 'white', borderRadius: 14, touchAction: 'none', cursor: 'crosshair', display: 'block', boxShadow: 'inset 0 0 0 2px rgba(226,196,122,.6)' }} />
      {!hayFirma && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#94A3B8', fontSize: 20, fontWeight: 600 }}>Firmá acá con el lápiz o el dedo</div>}
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 42, borderBottom: '1.5px dashed #CBD5E1', pointerEvents: 'none' }} />
      {hayFirma && (
        <button type="button" onClick={limpiar} style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F1F5F9', color: '#0F1E35', border: 'none', borderRadius: 9, padding: '8px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Eraser size={15} /> Borrar
        </button>
      )}
    </div>
  )
})

export default FirmaPad
