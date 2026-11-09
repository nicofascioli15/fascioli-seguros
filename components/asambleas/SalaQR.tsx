'use client'
import { useEffect, useState } from 'react'
import { QrCode, Maximize2, Download, X, Copy, Check } from 'lucide-react'
import { showToast } from '@/lib/toast'

// QR de la sala: los propietarios lo escanean para votar desde el celular. Vive mientras la asamblea esté abierta.
export default function SalaQR({ codigo, edificio, fecha }: { codigo: string; edificio: string; fecha: string }) {
  const [qr, setQr] = useState<string | null>(null)
  const [grande, setGrande] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/v/${codigo}` : `/v/${codigo}`

  useEffect(() => {
    import('qrcode').then(Q => Q.toDataURL(url, { width: 900, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0F1E35', light: '#FFFFFF' } }))
      .then(setQr).catch(() => setQr(null))
  }, [url])

  async function copiar() {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1600) } catch { showToast('No se pudo copiar', 'error') }
  }

  async function pdf() {
    if (!qr) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(15, 30, 53)
    doc.text('Votá desde tu celular', W / 2, 90, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(110, 120, 135)
    doc.text(`Asamblea ${edificio} · ${fecha.split('-').reverse().join('/')}`, W / 2, 118, { align: 'center' })
    const lado = 360
    doc.addImage(qr, 'PNG', (W - lado) / 2, 150, lado, lado)
    doc.setFontSize(13); doc.setTextColor(15, 30, 53)
    const pasos = ['1. Escaneá este código con la cámara del celular.', '2. Si sos propietario, registrate ahí mismo: apto, datos y firma.', '   (Si ya te registraste en la tablet, entrá con tu teléfono.)', '3. Si venís con poder de otra unidad, registralo en la tablet.', '4. Cuando se abra cada votación, votás desde el celular.']
    pasos.forEach((p, i) => doc.text(p, 70, 560 + i * 24))
    doc.setFontSize(10); doc.setTextColor(150)
    doc.text(url, W / 2, 680, { align: 'center' })
    doc.save(`QR asamblea - ${edificio.replace(/[\\/:*?"<>|]/g, '')}.pdf`)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '1.5px solid var(--gold)', borderRadius: 14, padding: '12px 16px', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ width: 76, height: 76, background: 'white', borderRadius: 10, padding: 4, flexShrink: 0, display: 'grid', placeItems: 'center', cursor: qr ? 'zoom-in' : 'default' }} onClick={() => qr && setGrande(true)}>
          {qr ? <img src={qr} alt="QR" style={{ width: '100%', height: '100%' }} /> : <QrCode size={30} color="#94A3B8" />}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>QR de la sala · votación desde el celular</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Un solo QR para toda la sesión, solo mientras la asamblea esté abierta. El propietario presente se registra desde el celular (apto, datos y firma) o entra con el teléfono con el que se registró en la tablet. Sin registrarse no puede votar. Los poderes van por la tablet.</div>
          <div style={{ fontSize: 12.5, marginTop: 4, fontFamily: 'monospace', color: 'var(--gold)', wordBreak: 'break-all' }}>{url}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary btn-sm" onClick={() => setGrande(true)} disabled={!qr}><Maximize2 size={13} /> Proyectar</button>
          <button className="btn-outline btn-sm" onClick={pdf} disabled={!qr}><Download size={13} /> PDF para imprimir</button>
          <button className="btn-outline btn-sm" onClick={copiar}>{copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Link'}</button>
        </div>
      </div>

      {grande && qr && (
        <div onClick={() => setGrande(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: '#0F1E35', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 30 }}>
          <button onClick={() => setGrande(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', borderRadius: 10, padding: 10, cursor: 'pointer' }}><X size={22} /></button>
          <div style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800 }}>Votá desde tu celular</div>
          <img src={qr} alt="QR" style={{ width: 'min(70vh, 80vw)', height: 'min(70vh, 80vw)', background: 'white', borderRadius: 18, padding: 14 }} />
          <div style={{ fontSize: 'clamp(15px, 2vw, 22px)', color: '#B8C5D6', textAlign: 'center' }}>Escaneá con la cámara, registrate y votá desde tu celular · {edificio}</div>
        </div>
      )}
    </>
  )
}
