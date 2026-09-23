'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { sanitizeFileName, descargarDocumento } from '@/lib/files'
import { showToast } from '@/lib/toast'
import { registrarAudit } from '@/lib/audit'
import ConfirmDialog from '@/components/ConfirmDialog'
import { DOCS_TIPOS_OBRAS, formatFecha } from '@/lib/obrasConfig'

type Doc = { id: string; nombre: string; tipo: string; storage_path: string; tamanio_bytes: number; created_at: string; pago_id?: string | null; ley_id?: string | null }

function formatBytes(b: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function ObraDocumentos({ obraId, etiqueta, tipoInicial, onCount }: { obraId: string; etiqueta: string; tipoInicial?: string; onCount?: (n: number) => void }) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [tipoSel, setTipoSel] = useState(tipoInicial || DOCS_TIPOS_OBRAS[0])
  const [filtro, setFiltro] = useState('')
  const [drag, setDrag] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<Doc | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { if (tipoInicial) setTipoSel(tipoInicial) }, [tipoInicial])
  useEffect(() => { fetchDocs() }, [obraId])

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase.from('obras_documentos').select('*').eq('obra_id', obraId).order('created_at', { ascending: false })
    setDocs(data || [])
    onCount?.((data || []).length)
    setLoading(false)
  }

  async function onFile(files: FileList | null) {
    const list = files ? Array.from(files) : []
    if (list.length === 0) return
    setUploading(true)
    const errores: string[] = []
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const path = `obras/${obraId}/${Date.now()}_${i}_${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from('documentos').upload(path, file, { upsert: false })
      if (error) { errores.push(`${file.name}: ${error.message}`); continue }
      const { data, error: insErr } = await supabase.from('obras_documentos').insert([{ obra_id: obraId, nombre: file.name, tipo: tipoSel, storage_path: path, tamanio_bytes: file.size }]).select().single()
      if (insErr) { errores.push(`${file.name}: ${insErr.message}`); continue }
      await registrarAudit({ accion: 'crear', tabla: 'obras_documentos', registroId: data?.id, descripcion: `Documento subido (${tipoSel}): ${file.name} — ${etiqueta}`, datosDespues: data })
    }
    await fetchDocs()
    setUploading(false)
    if (errores.length > 0) showToast(`Error al subir: ${errores.join(' · ')}`, 'error')
    else showToast(list.length > 1 ? `${list.length} archivos subidos` : 'Archivo subido', 'success')
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await supabase.storage.from('documentos').remove([confirmEliminar.storage_path])
    await supabase.from('obras_documentos').delete().eq('id', confirmEliminar.id)
    await registrarAudit({ accion: 'eliminar', tabla: 'obras_documentos', registroId: confirmEliminar.id, descripcion: `Documento eliminado: ${confirmEliminar.nombre} — ${etiqueta}`, datosAntes: confirmEliminar })
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchDocs()
  }

  const tiposPresentes = Array.from(new Set(docs.map(d => d.tipo).filter(Boolean)))
  const visibles = filtro ? docs.filter(d => d.tipo === filtro) : docs

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', gap: 12, marginBottom: 14, alignItems: 'stretch' }} className="obra-docs-top">
        <div className="fgroup" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>Tipo de documento</label>
          <select value={tipoSel} onChange={e => setTipoSel(e.target.value)}>
            {DOCS_TIPOS_OBRAS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!uploading) setDrag(true) }}
          onDragLeave={e => { e.preventDefault(); setDrag(false) }}
          onDrop={e => { e.preventDefault(); setDrag(false); if (!uploading) onFile(e.dataTransfer.files) }}
          style={{ border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: drag ? 'var(--gold-pale)' : 'var(--bg-card-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)' }}>
          {uploading ? <><Loader2 size={16} className="spin" /> Subiendo...</> : <><Upload size={16} /> {drag ? 'Soltá los archivos acá' : 'Arrastrá archivos o hacé click (contrato, facturas, planos, fotos...)'}</>}
        </div>
      </div>
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx,.dwg" onChange={e => { onFile(e.target.files); e.target.value = '' }} />

      {tiposPresentes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <button className={`filter-btn ${!filtro ? 'active' : ''}`} onClick={() => setFiltro('')}>Todos ({docs.length})</button>
          {tiposPresentes.map(t => <button key={t} className={`filter-btn ${filtro === t ? 'active' : ''}`} onClick={() => setFiltro(t)}>{t} ({docs.filter(d => d.tipo === t).length})</button>)}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><Loader2 size={20} className="spin" /></div>
      ) : visibles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 12 }}>Sin documentos adjuntos</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
          {visibles.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 9 }}>
              <FileText size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.nombre}>{d.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.tipo} · {formatBytes(d.tamanio_bytes)} · {formatFecha(d.created_at)}{d.pago_id ? ' · adjunto a una cuota' : d.ley_id ? ' · adjunto a leyes sociales' : ''}</div>
              </div>
              <button className="btn-outline btn-sm" title="Descargar" onClick={() => descargarDocumento(supabase, d.storage_path)}><Download size={12} /></button>
              <button className="btn-outline btn-sm" title="Eliminar" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(d)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar este documento?"
        message={<>Se va a eliminar <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar?.nombre}</strong>. Esta acción no se puede deshacer.</>}
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
      <style>{`@media (max-width: 640px) { .obra-docs-top { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
