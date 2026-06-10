#!/bin/bash
set -e
echo 'Actualizando documentos...'

cat > app/documentos/page.tsx << 'FILEEOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, Search, Loader2, X, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const TIPOS_DOC = ['Póliza', 'Endoso', 'Siniestro', 'Identificación', 'Cobro', 'Otros']
const TIPOS_FILTRO = ['Todos', ...TIPOS_DOC]

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

function getExt(nombre: string) { return nombre.split('.').pop()?.toLowerCase() || 'pdf' }
function formatBytes(b: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}
function formatFecha(iso: string) {
  const [y,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${y}`
}

type Documento = {
  id: string; nombre: string; tipo: string; storage_path: string
  tamanio_bytes: number; created_at: string
  clientes: { nombre: string } | null
  polizas: { numero: string; ramo: string } | null
}
type Cliente = { id: string; nombre: string; direccion: string }
type Poliza  = { id: string; numero: string; ramo: string; compania: string }
type Paso    = 'cliente' | 'poliza' | 'archivo'

export default function DocumentosPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [docs, setDocs]             = useState<Documento[]>([])
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [polizasCliente, setPolizasCliente] = useState<Poliza[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [drag, setDrag]             = useState(false)
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  // Modal upload (3 pasos)
  const [showModal, setShowModal]   = useState(false)
  const [paso, setPaso]             = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [polizaSel, setPolizaSel]   = useState<Poliza | null>(null)
  const [fileSel, setFileSel]       = useState<File | null>(null)
  const [tipoDoc, setTipoDoc]       = useState('Póliza')

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
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchPolizasCliente(clienteId: string) {
    const { data } = await supabase
      .from('polizas').select('id, numero, ramo, compania')
      .eq('cliente_id', clienteId).order('ramo')
    setPolizasCliente(data || [])
  }

  function abrirModal() {
    setPaso('cliente'); setClienteSearch(''); setClienteSel(null)
    setPolizaSel(null); setFileSel(null); setTipoDoc('Póliza')
    setPolizasCliente([])
    setShowModal(true)
  }

  function cerrarModal() { setShowModal(false) }

  // Cuando el usuario elige un archivo en el paso 3
  function onFileChange(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileSel(files[0])
  }

  async function confirmarSubida() {
    if (!clienteSel || !polizaSel || !fileSel) return
    setUploading(true)
    cerrarModal()

    const path = `${clienteSel.id}/${polizaSel.id}/${Date.now()}_${fileSel.name.replace(/\s/g, '_')}`

    const { error: storageErr } = await supabase.storage
      .from('documentos')
      .upload(path, fileSel, { upsert: false })

    if (storageErr) {
      alert(`Error al subir: ${storageErr.message}`)
      setUploading(false)
      return
    }

    await supabase.from('documentos').insert([{
      nombre:        fileSel.name,
      tipo:          tipoDoc,
      storage_path:  path,
      tamanio_bytes: fileSel.size,
      cliente_id:    clienteSel.id,
      poliza_id:     polizaSel.id,
    }])

    setUploading(false)
    setFileSel(null)
    await fetchDocs()
  }

  // Drag & drop en la zona principal también abre el modal
  function handleDrop(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileSel(files[0])
    abrirModal()
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

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Documentos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Archivo centralizado de pólizas, endosos y expedientes</p>
        </div>
        <button className="btn-primary" onClick={abrirModal} disabled={uploading}>
          {uploading
            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subiendo...</>
            : <><Upload size={14} /> Subir archivo</>}
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleDrop(e.dataTransfer.files) }}
        onClick={abrirModal}
        style={{
          border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12,
          padding: '28px 24px', textAlign: 'center', marginBottom: 24,
          background: drag ? 'var(--gold-pale)' : '#FAFBFC', transition: 'all .2s', cursor: 'pointer'
        }}
      >
        {uploading
          ? <><Loader2 size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)', display: 'block', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 600, color: 'var(--gold)', fontSize: 14 }}>Subiendo archivo...</div></>
          : <><Upload size={24} style={{ margin: '0 auto 8px', color: drag ? 'var(--gold)' : 'var(--slate)', display: 'block' }} />
              <div style={{ fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: 14 }}>
                {drag ? 'Soltá el archivo' : 'Arrastrá un archivo acá'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel · Se asignará a un cliente y póliza</div></>
        }
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar archivo o cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPOS_FILTRO.map(t => <button key={t} onClick={() => setFiltroTipo(t)} className={`filter-btn ${filtroTipo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 52 }} /><col /><col style={{ width: 130 }} />
            <col style={{ width: 160 }} /><col style={{ width: 150 }} /><col style={{ width: 90 }} /><col style={{ width: 110 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr><th></th><th>Archivo</th><th>Tipo</th><th>Cliente</th><th>Póliza</th><th>Tamaño</th><th>Subido</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando documentos...
              </td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
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
                  <td style={{ fontSize: 12, color: 'var(--slate)' }}>
                    {d.polizas ? <><span className="badge badge-neutral" style={{ marginRight: 4 }}>{d.polizas.ramo}</span>{d.polizas.numero}</> : '—'}
                  </td>
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

      {/* ── MODAL SUBIR (3 pasos: cliente → póliza → archivo) ── */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? '👥 Seleccionar cliente' : paso === 'poliza' ? '📄 Seleccionar póliza' : '📎 Subir archivo'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? 1 : paso === 'poliza' ? 2 : 3} de 3
                  {clienteSel && paso !== 'cliente' && ` — ${clienteSel.nombre}`}
                  {polizaSel && paso === 'archivo' && ` · ${polizaSel.ramo} ${polizaSel.numero}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {/* Barra de progreso */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {['cliente','poliza','archivo'].map((p, i) => {
                const idx = ['cliente','poliza','archivo'].indexOf(paso)
                return <div key={p} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .2s', background: i <= idx ? 'var(--gold)' : 'var(--border)' }} />
              })}
            </div>

            {/* Paso 1: cliente */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
                  <input placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--navy)' }} />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.map(c => (
                    <div key={c.id}
                      onClick={() => { setClienteSel(c); fetchPolizasCliente(c.id); setPaso('poliza') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{c.direccion}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No se encontraron clientes</div>}
                </div>
              </>
            )}

            {/* Paso 2: póliza */}
            {paso === 'poliza' && (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {polizasCliente.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>Este cliente no tiene pólizas cargadas</div>
                  ) : polizasCliente.map(p => (
                    <div key={p.id}
                      onClick={() => { setPolizaSel(p); setPaso('archivo') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLDivElement).style.background='var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLDivElement).style.background='white' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-neutral">{p.ramo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{p.numero}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{p.compania}</div>
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
                <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-start' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                </div>
              </>
            )}

            {/* Paso 3: archivo */}
            {paso === 'archivo' && (
              <>
                {/* Drop zone dentro del modal */}
                <div
                  onClick={() => inputRef.current?.click()}
                  style={{
                    border: `2px dashed ${fileSel ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '24px', textAlign: 'center', cursor: 'pointer',
                    background: fileSel ? '#F0FDF8' : '#FAFBFC', marginBottom: 16, transition: 'all .2s'
                  }}
                >
                  {fileSel ? (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                      <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>{fileSel.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{formatBytes(fileSel.size)} · Click para cambiar</div>
                    </>
                  ) : (
                    <>
                      <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--slate)', display: 'block' }} />
                      <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14 }}>Hacé click para seleccionar</div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel</div>
                    </>
                  )}
                </div>
                <input ref={inputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={e => onFileChange(e.target.files)} />

                <div className="fgroup">
                  <label>Tipo de documento</label>
                  <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                    {TIPOS_DOC.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('poliza')}>← Cambiar póliza</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={confirmarSubida} disabled={!fileSel}>
                      <Upload size={14} /> Subir archivo
                    </button>
                  </div>
                </div>
              </>
            )}
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
echo '🎉 Listo:'
echo '   git add .'
echo '   git commit -m "feat: subida de archivos obligatoriamente vinculada a cliente y poliza"'
echo '   git push'
