'use client'
import { useState, useRef } from 'react'
import { Upload, Download, Trash2, Search } from 'lucide-react'

const TIPOS = ['Todos', 'Póliza', 'Endoso', 'Siniestro', 'Identificación', 'Cobro', 'Otros']
const extStyle: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: '#FEE2E2', color: '#991B1B', label: 'PDF' },
  jpg:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  jpeg: { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  png:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  docx: { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  xlsx: { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
}

export default function DocumentosPage() {
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [drag, setDrag]             = useState(false)
  const inputRef                    = useRef<HTMLInputElement>(null)
  const docs: any[]                 = []

  const filtrados = docs.filter(d => {
    const q = search.toLowerCase()
    return (!q || d.nombre?.toLowerCase().includes(q) || d.cliente?.toLowerCase().includes(q)) &&
           (filtroTipo === 'Todos' || d.tipo === filtroTipo)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Documentos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Archivo centralizado de pólizas, endosos y expedientes</p>
        </div>
        <button className="btn-primary" onClick={() => inputRef.current?.click()}><Upload size={14} /> Subir archivos</button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} />
      </div>
      <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false) }} onClick={() => inputRef.current?.click()}
        style={{ border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12, padding: '28px 24px', textAlign: 'center', marginBottom: 24, background: drag ? 'var(--gold-pale)' : '#FAFBFC', transition: 'all .2s', cursor: 'pointer' }}>
        <Upload size={24} style={{ margin: '0 auto 8px', color: drag ? 'var(--gold)' : 'var(--slate)', display: 'block' }} />
        <div style={{ fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: 14 }}>{drag ? 'Soltá para subir' : 'Arrastrá archivos acá'}</div>
        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel</div>
      </div>
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
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay documentos subidos</div>
                <div style={{ fontSize: 12 }}>Arrastrá archivos arriba o usá el botón "Subir archivos"</div>
              </td></tr>
            ) : filtrados.map((d, i) => {
              const ext = extStyle[d.nombre?.split('.').pop()?.toLowerCase() || ''] || extStyle.pdf
              return (
                <tr key={i}>
                  <td><div style={{ width: 36, height: 36, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span></div></td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{d.nombre}</td>
                  <td><span className="badge badge-neutral">{d.tipo}</span></td>
                  <td style={{ fontSize: 13 }}>{d.cliente}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{d.tamanio}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{d.fecha}</td>
                  <td><div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-outline btn-sm"><Download size={13} /></button>
                    <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }}><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
