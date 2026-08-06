'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Upload, Download, Trash2, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { sanitizeFileName } from '@/lib/files'
import ConfirmDialog from '@/components/ConfirmDialog'

type Doc = { id: string; nombre: string; tipo: string; storage_path: string; tamanio_bytes: number; created_at: string }

type Props = {
  contratoId: string
  clienteNombre: string
  tiposSugeridos: string[]
  onClose: () => void
}

function formatBytes(b: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function ContratosDocumentos({ contratoId, clienteNombre, tiposSugeridos, onClose }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [docs, setDocs]         = useState<Doc[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [tipoSel, setTipoSel]   = useState(tiposSugeridos[0] || '')
  const [drag, setDrag]         = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<Doc | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetchDocs() }, [contratoId])

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase.from('contratos_documentos').select('*').eq('contrato_id', contratoId).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function onFile(files: FileList | null) {
    const list = files ? Array.from(files) : []
    if (list.length === 0) return
    setUploading(true)
    const tipo = tipoSel
    const errores: string[] = []
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const path = `contratos/${contratoId}/${Date.now()}_${i}_${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from('documentos').upload(path, file, { upsert: false })
      if (!error) {
        await supabase.from('contratos_documentos').insert([{ contrato_id: contratoId, nombre: file.name, tipo, storage_path: path, tamanio_bytes: file.size }])
      } else {
        errores.push(`${file.name}: ${error.message}`)
      }
    }
    await fetchDocs()
    setUploading(false)
    if (errores.length > 0) alert(`Error al subir:\n${errores.join('\n')}`)
  }

  async function descargar(d: Doc) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(d.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    await supabase.storage.from('documentos').remove([confirmEliminar.storage_path])
    await supabase.from('contratos_documentos').delete().eq('id', confirmEliminar.id)
    setEliminando(false)
    setConfirmEliminar(null)
    await fetchDocs()
  }

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pago-modal" style={{ width: 460, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Documentos</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>{clienteNombre}</div>

        <div className="fgroup" style={{ margin: '0 0 10px' }}>
          <label style={{ fontSize: 11 }}>Tipo de documento</label>
          <select value={tipoSel} onChange={e => setTipoSel(e.target.value)}>
            {tiposSugeridos.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!uploading) setDrag(true) }}
          onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDrag(false) }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); setDrag(false); if (!uploading) onFile(e.dataTransfer.files) }}
          style={{
            border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 10,
            padding: '20px 16px', textAlign: 'center', marginBottom: 16, cursor: uploading ? 'default' : 'pointer',
            background: drag ? 'var(--gold-pale)' : 'var(--bg-card-alt)', transition: 'all .15s',
          }}
        >
          {uploading ? (
            <><Loader2 size={20} style={{ margin: '0 auto 6px', display: 'block', color: 'var(--gold)', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 600, color: 'var(--gold)', fontSize: 13 }}>Subiendo...</div></>
          ) : (
            <><Upload size={20} style={{ margin: '0 auto 6px', display: 'block', color: drag ? 'var(--gold)' : 'var(--text-muted)' }} />
              <div style={{ fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: 13 }}>
                {drag ? 'Soltá los archivos acá' : 'Arrastrá uno o más archivos o hacé click'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>PDF, JPG, PNG, Word, Excel</div></>
          )}
        </div>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={e => { onFile(e.target.files); e.target.value = '' }} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin documentos adjuntos</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-soft)', borderRadius: 9 }}>
                <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.tipo} · {formatBytes(d.tamanio_bytes)}</div>
                </div>
                <button className="btn-outline btn-sm" onClick={() => descargar(d)}><Download size={12} /></button>
                <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(d)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar este documento?"
        message={<>Se va a eliminar <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar?.nombre}</strong>. Esta acción no se puede deshacer.</>}
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}
