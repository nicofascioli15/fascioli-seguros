'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Paperclip, Upload, Download, Trash2, Loader2, FileText, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { sanitizeFileName, descargarDocumento } from '@/lib/files'
import { showToast } from '@/lib/toast'
import { registrarAudit } from '@/lib/audit'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatFecha } from '@/lib/obrasConfig'

// Comprobantes adjuntos a una cuota (pago_id) o a un mes de leyes sociales (ley_id).
// Se guardan en obras_documentos, así también aparecen en la pestaña Documentos de la obra.
export type CampoAdjunto = 'pago_id' | 'ley_id'
export type Adjunto = { id: string; nombre: string; tipo: string | null; storage_path: string; tamanio_bytes: number | null; created_at: string; pago_id?: string | null; ley_id?: string | null }

export const ACCEPT_ADJUNTOS = '.pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx'

function formatBytes(b: number | null) {
  if (!b) return ''
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

// Trae todos los adjuntos de la obra agrupados por cuota / mes.
export function useAdjuntos(obraId: string, campo: CampoAdjunto) {
  const supabase = createClient()
  const [porItem, setPorItem] = useState<Record<string, Adjunto[]>>({})
  const recargar = useCallback(async () => {
    const { data, error } = await supabase.from('obras_documentos')
      .select(`id, nombre, tipo, storage_path, tamanio_bytes, created_at, ${campo}`)
      .eq('obra_id', obraId).not(campo, 'is', null).order('created_at')
    if (error) { setPorItem({}); return }   // si todavía no se corrió el SQL, simplemente no hay adjuntos
    const m: Record<string, Adjunto[]> = {}
    ;(data || []).forEach((d: any) => { (m[d[campo]] ||= []).push(d) })
    setPorItem(m)
  }, [obraId, campo])
  useEffect(() => { recargar() }, [recargar])
  return { porItem, recargar }
}

export async function subirAdjuntos(opts: { obraId: string; campo: CampoAdjunto; itemId: string; tipo: string; files: File[]; etiqueta: string }): Promise<string[]> {
  const supabase = createClient()
  const errores: string[] = []
  for (let i = 0; i < opts.files.length; i++) {
    const file = opts.files[i]
    const path = `obras/${opts.obraId}/${Date.now()}_${i}_${sanitizeFileName(file.name)}`
    const { error } = await supabase.storage.from('documentos').upload(path, file, { upsert: false })
    if (error) { errores.push(`${file.name}: ${error.message}`); continue }
    const { data, error: insErr } = await supabase.from('obras_documentos')
      .insert([{ obra_id: opts.obraId, nombre: file.name, tipo: opts.tipo, storage_path: path, tamanio_bytes: file.size, [opts.campo]: opts.itemId }])
      .select().single()
    if (insErr) {
      await supabase.storage.from('documentos').remove([path])
      errores.push(`${file.name}: ${insErr.message}`)
      continue
    }
    await registrarAudit({ accion: 'crear', tabla: 'obras_documentos', registroId: data?.id, descripcion: `Comprobante adjunto: ${file.name} — ${opts.etiqueta}`, datosDespues: data })
  }
  return errores
}

// Botón con clip; si ya hay comprobantes muestra la cantidad.
export function AdjuntoBoton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button className="btn-outline btn-sm" onClick={onClick}
      title={count ? `${count} comprobante${count > 1 ? 's' : ''} adjunto${count > 1 ? 's' : ''}` : 'Adjuntar comprobante'}
      style={{ fontSize: 11, marginLeft: 6, position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4, ...(count ? { color: 'var(--navy)', borderColor: 'var(--gold)', background: 'var(--gold-pale)' } : {}) }}>
      <Paperclip size={12} />
      {count > 0 && <span style={{ fontSize: 11, fontWeight: 800 }}>{count}</span>}
    </button>
  )
}

// Selector de archivo compacto para el modal "Registrar pago".
export function SelectorComprobante({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="fgroup">
      <label>Comprobante <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span></label>
      <div onClick={() => ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]) }}
        style={{ border: '1.5px dashed var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', background: 'var(--bg-card-alt)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>
        <Paperclip size={14} /> {files.length ? `${files.length} archivo${files.length > 1 ? 's' : ''} para adjuntar` : 'Adjuntar comprobante (o arrastralo acá)'}
      </div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <FileText size={12} color="var(--gold)" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}
      <input ref={ref} type="file" multiple style={{ display: 'none' }} accept={ACCEPT_ADJUNTOS} onChange={e => { setFiles([...files, ...Array.from(e.target.files || [])]); e.target.value = '' }} />
    </div>
  )
}

// Modal con los comprobantes de una cuota / mes: ver, descargar, borrar y subir más.
export function AdjuntosModal({ obraId, campo, itemId, titulo, subtitulo, tipo, etiqueta, docs, onClose, onChange }: {
  obraId: string; campo: CampoAdjunto; itemId: string; titulo: string; subtitulo: string; tipo: string; etiqueta: string
  docs: Adjunto[]; onClose: () => void; onChange: () => void
}) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [drag, setDrag] = useState(false)
  const [borrar, setBorrar] = useState<Adjunto | null>(null)
  const [borrando, setBorrando] = useState(false)

  async function subir(list: File[]) {
    if (!list.length) return
    setSubiendo(true)
    const errores = await subirAdjuntos({ obraId, campo, itemId, tipo, files: list, etiqueta })
    setSubiendo(false)
    if (errores.length) showToast(`Error al subir: ${errores.join(' · ')}`, 'error')
    else showToast(list.length > 1 ? `${list.length} comprobantes adjuntos` : 'Comprobante adjunto', 'success')
    onChange()
  }

  async function eliminar() {
    if (!borrar) return
    setBorrando(true)
    const { error } = await supabase.from('obras_documentos').delete().eq('id', borrar.id)
    if (error) { setBorrando(false); showToast(error.message, 'error'); return }
    await supabase.storage.from('documentos').remove([borrar.storage_path])
    await registrarAudit({ accion: 'eliminar', tabla: 'obras_documentos', registroId: borrar.id, descripcion: `Comprobante eliminado: ${borrar.nombre} — ${etiqueta}`, datosAntes: borrar })
    setBorrando(false)
    setBorrar(null)
    onChange()
  }

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !subiendo) onClose() }}>
      <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Paperclip size={16} /> {titulo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{subtitulo}</div>

        {docs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0 14px' }}>Todavía no hay comprobantes.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: 'var(--bg-card-alt)', border: '1px solid var(--border-soft)', borderRadius: 9 }}>
                <FileText size={17} color="var(--gold)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.nombre}>{d.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFecha(d.created_at)}{d.tamanio_bytes ? ` · ${formatBytes(d.tamanio_bytes)}` : ''}</div>
                </div>
                <button className="btn-outline btn-sm" title="Ver / descargar" onClick={() => descargarDocumento(supabase, d.storage_path)}><Download size={12} /></button>
                <button className="btn-outline btn-sm" title="Eliminar" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setBorrar(d)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}

        <div
          onClick={() => !subiendo && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!subiendo) setDrag(true) }}
          onDragLeave={e => { e.preventDefault(); setDrag(false) }}
          onDrop={e => { e.preventDefault(); setDrag(false); if (!subiendo) subir(Array.from(e.dataTransfer.files)) }}
          style={{ border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px', cursor: subiendo ? 'default' : 'pointer', background: drag ? 'var(--gold-pale)' : 'var(--bg-card-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)' }}>
          {subiendo ? <><Loader2 size={15} className="spin" /> Subiendo...</> : <><Upload size={15} /> {drag ? 'Soltá los archivos acá' : 'Subir comprobante (click o arrastrar)'}</>}
        </div>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} accept={ACCEPT_ADJUNTOS} onChange={e => { subir(Array.from(e.target.files || [])); e.target.value = '' }} />
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>También quedan guardados en la pestaña Documentos de la obra.</div>

        <ConfirmDialog
          open={!!borrar}
          title="¿Eliminar este comprobante?"
          message={<>Se va a eliminar <strong style={{ color: 'var(--text-main)' }}>{borrar?.nombre}</strong>. Esta acción no se puede deshacer.</>}
          loading={borrando}
          onConfirm={eliminar}
          onCancel={() => setBorrar(null)}
        />
      </div>
    </div>
  )
}
