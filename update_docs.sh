#!/bin/bash
set -e
echo 'Actualizando documentos...'

cat > app/documentos/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, Search, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const TIPOS = ['Todos', 'Póliza', 'Endoso', 'Siniestro', 'Identificación', 'Cobro', 'Otros']

const extStyle: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: '#FEE2E2', color: '#991B1B', label: 'PDF' },
  jpg:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  jpeg: { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  png:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  docx: { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  doc:  { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  xlsx: { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
  xls:  { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
}

function getExt(nombre: string) {
  return nombre.split('.').pop()?.toLowerCase() || 'pdf'
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatFecha(iso: string) {
  const [y,m,d] = iso.slice(0,10).split('-')
  return `${d}/${m}/${y}`
}

type Documento = {
  id: string
  nombre: string
  tipo: string
  storage_path: string
  tamanio_bytes: number
  created_at: string
  clientes: { nombre: string } | null
  polizas: { numero: string; ramo: string } | null
}

type Cliente = { id: string; nombre: string }
type Poliza  = { id: string; numero: string; ramo: string }

export default function DocumentosPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [docs, setDocs]             = useState<Documento[]>([])
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [polizas, setPolizas]       = useState<Poliza[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [drag, setDrag]             = useState(false)
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  // Modal de metadatos al subir
  const [showMeta, setShowMeta]     = useState(false)
  const [filePending, setFilePending] = useState<File | null>(null)
  const [meta, setMeta]             = useState({ tipo: 'Póliza', cliente_id: '', poliza_id: '' })

  useEffect(() => { fetchDocs(); fetchClientes() }, [])

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('documentos')
      .select('*, clientes(nombre), polizas(numero, ramo)')
      .order('created_at', { ascending: false })
    if (data) setDocs(data)
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchPolizasCliente(clienteId: string) {
    const { data } = await supabase.from('polizas').select('id, numero, ramo').eq('cliente_id', clienteId).order('ramo')
    setPolizas(data || [])
  }

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    setFilePending(files[0])
    setMeta({ tipo: 'Póliza', cliente_id: '', poliza_id: '' })
    setShowMeta(true)
  }

  async function subirArchivo() {
    if (!filePending) return
    setUploading(true)
    setShowMeta(false)

    const ext      = getExt(filePending.name)
    const path     = `${Date.now()}_${filePending.name.replace(/\s/g, '_')}`

    // 1. Subir a Storage
    const { error: storageError } = await supabase.storage
      .from('documentos')
      .upload(path, filePending, { upsert: false })

    if (storageError) {
      alert(`Error al subir: ${storageError.message}`)
      setUploading(false)
      return
    }

    // 2. Guardar metadatos en tabla documentos
    await supabase.from('documentos').insert([{
      nombre:        filePending.name,
      tipo:          meta.tipo,
      storage_path:  path,
      tamanio_bytes: filePending.size,
      cliente_id:    meta.cliente_id || null,
      poliza_id:     meta.poliza_id  || null,
    }])

    setUploading(false)
    setFilePending(null)
    await fetchDocs()
  }

  async function descargar(doc: Documento) {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return
    await supabase.storage.from('documentos').remove([doc.storage_path])
    await supabase.from('documentos').delete().eq('id', doc.id)
    await fetchDocs()
  }

  const filtrados = docs.filter(d => {
    const q = search.toLowerCase()
    return (!q || d.nombre.toLowerCase().includes(q) || (d.clientes?.nombre || '').toLowerCase().includes(q)) &&
           (filtroTipo === 'Todos' || d.tipo === filtroTipo)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Documentos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Archivo centralizado de pólizas, endosos y expedientes</p>
        </div>
        <button className="btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</> : <><Upload size={14} /> Subir archivo</>}
        </button>
        <input ref={inputRef} type="file" multiple={false} style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={e => handleFileSelect(e.target.files)} />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFileSelect(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12,
          padding: '28px 24px', textAlign: 'center', marginBottom: 24,
          background: drag ? 'var(--gold-pale)' : '#FAFBFC', transition: 'all .2s', cursor: 'pointer'
        }}
      >
        {uploading ? (
          <><Loader2 size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)', display: 'block', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontWeight: 600, color: 'var(--gold)', fontSize: 14 }}>Subiendo archivo...</div></>
        ) : (
          <><Upload size={24} style={{ margin: '0 auto 8px', color: drag ? 'var(--gold)' : 'var(--slate)', display: 'block' }} />
          <div style={{ fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: 14 }}>
            {drag ? 'Soltá para subir' : 'Arrastrá archivos acá'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel</div></>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar archivo o cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPOS.map(t => <button key={t} onClick={() => setFiltroTipo(t)} className={`filter-btn ${filtroTipo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 52 }} /><col /><col style={{ width: 130 }} />
            <col style={{ width: 180 }} /><col style={{ width: 90 }} /><col style={{ width: 110 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr><th></th><th>Archivo</th><th>Tipo</th><th>Cliente</th><th>Tamaño</th><th>Subido</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando documentos...
              </td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay documentos subidos</div>
                <div style={{ fontSize: 12 }}>Arrastrá archivos arriba o usá el botón "Subir archivo"</div>
              </td></tr>
            ) : filtrados.map(d => {
              const ext = extStyle[getExt(d.nombre)] || extStyle.pdf
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ width: 36, height: 36, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{d.nombre}</td>
                  <td><span className="badge badge-neutral">{d.tipo}</span></td>
                  <td style={{ fontSize: 13 }}>{d.clientes?.nombre || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatBytes(d.tamanio_bytes)}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatFecha(d.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-outline btn-sm" onClick={() => descargar(d)} title="Descargar"><Download size={13} /></button>
                      <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => eliminar(d)} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal metadatos */}
      {showMeta && filePending && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowMeta(false) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>📎 Subir archivo</h3>
              <button onClick={() => setShowMeta(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {filePending.name} · {formatBytes(filePending.size)}
            </div>
            <div className="fgroup">
              <label>Tipo de documento</label>
              <select value={meta.tipo} onChange={e => setMeta({ ...meta, tipo: e.target.value })}>
                {TIPOS.filter(t => t !== 'Todos').map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="fgroup">
              <label>Cliente (opcional)</label>
              <select value={meta.cliente_id} onChange={e => { setMeta({ ...meta, cliente_id: e.target.value, poliza_id: '' }); if (e.target.value) fetchPolizasCliente(e.target.value) }}>
                <option value="">— Sin asignar —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            {meta.cliente_id && polizas.length > 0 && (
              <div className="fgroup">
                <label>Póliza (opcional)</label>
                <select value={meta.poliza_id} onChange={e => setMeta({ ...meta, poliza_id: e.target.value })}>
                  <option value="">— Sin asignar —</option>
                  {polizas.map(p => <option key={p.id} value={p.id}>{p.ramo} · {p.numero}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowMeta(false)}>Cancelar</button>
              <button className="btn-primary" onClick={subirArchivo}><Upload size={14} /> Confirmar subida</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

FILEEOF
echo '✅ app/documentos/page.tsx'

echo ''
echo '🎉 Listo. Ahora:'
echo '   git add .'
echo '   git commit -m "feat: subida real de archivos a Supabase Storage"'
echo '   git push'
