'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Upload, Download, Trash2, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Doc = { id: string; nombre: string; tipo: string; storage_path: string; tamanio_bytes: number; created_at: string }

type Props = {
  tabla: 'mant_extintores' | 'mant_tanques'
  registroId: string
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

export default function MantDocumentos({ tabla, registroId, clienteNombre, tiposSugeridos, onClose }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const fkCol = tabla === 'mant_extintores' ? 'extintor_id' : 'tanque_id'

  const [docs, setDocs]         = useState<Doc[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [tipoSel, setTipoSel]   = useState(tiposSugeridos[0] || '')
  const [drag, setDrag]         = useState(false)

  useEffect(() => { fetchDocs() }, [registroId])

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase.from('mant_documentos').select('*').eq(fkCol, registroId).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function onFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    const path = `mantenimiento/${tabla}/${registroId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
    const { error } = await supabase.storage.from('documentos').upload(path, file, { upsert: false })
    if (!error) {
      await supabase.from('mant_documentos').insert([{ [fkCol]: registroId, nombre: file.name, tipo: tipoSel, storage_path: path, tamanio_bytes: file.size }])
      await fetchDocs()
    } else {
      alert(`Error al subir: ${error.message}`)
    }
    setUploading(false)
  }

  async function descargar(d: Doc) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(d.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminar(d: Doc) {
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([d.storage_path])
    await supabase.from('mant_documentos').delete().eq('id', d.id)
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
                {drag ? 'Soltá el archivo acá' : 'Arrastrá un archivo o hacé click'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>PDF, JPG, PNG, Word, Excel</div></>
          )}
        </div>
        <input ref={inputRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
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
                <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminar(d)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  )
}
