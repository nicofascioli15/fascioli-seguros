'use client'
import { useState } from 'react'
import { Upload, File, FolderOpen, Search, Download, Trash2 } from 'lucide-react'

const documentosData = [
  { id: 1, nombre: 'Poliza_POL00347_BSE.pdf', tipo: 'Póliza', cliente: 'Rodríguez, María', tamanio: '1.2 MB', fecha: '04/06/2026', ext: 'pdf' },
  { id: 2, nombre: 'Presupuesto_SIN041_Taller.pdf', tipo: 'Siniestro', cliente: 'Martínez, Roberto', tamanio: '0.8 MB', fecha: '05/06/2026', ext: 'pdf' },
  { id: 3, nombre: 'DNI_Garcia_Federico.jpg', tipo: 'Identificación', cliente: 'García, Federico', tamanio: '0.3 MB', fecha: '02/06/2026', ext: 'img' },
  { id: 4, nombre: 'Endoso_POL00346.pdf', tipo: 'Endoso', cliente: 'Pérez, Andrés', tamanio: '0.5 MB', fecha: '01/06/2026', ext: 'pdf' },
  { id: 5, nombre: 'Tarjeta_circulacion_Martinez.pdf', tipo: 'Automotor', cliente: 'Martínez, Roberto', tamanio: '0.4 MB', fecha: '30/05/2026', ext: 'pdf' },
  { id: 6, nombre: 'Informe_Pericial_SIN038.docx', tipo: 'Siniestro', cliente: 'Pérez, Andrés', tamanio: '2.1 MB', fecha: '28/05/2026', ext: 'doc' },
  { id: 7, nombre: 'Recibo_PAG0891.xlsx', tipo: 'Cobro', cliente: 'Rodríguez, María', tamanio: '0.1 MB', fecha: '02/06/2026', ext: 'xls' },
]

const extColor: Record<string, { bg: string, text: string, label: string }> = {
  pdf: { bg: '#FDEAEA', text: '#B03030', label: 'PDF' },
  img: { bg: '#E6F0FF', text: '#2456B0', label: 'IMG' },
  doc: { bg: '#FFF4E5', text: '#B5630A', label: 'DOC' },
  xls: { bg: '#E6F7F0', text: '#2A7A56', label: 'XLS' },
}

export default function DocumentosPage() {
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [drag, setDrag] = useState(false)

  const tipos = ['Todos', ...Array.from(new Set(documentosData.map(d => d.tipo)))]
  const filtrados = documentosData.filter(d => {
    const matchS = d.nombre.toLowerCase().includes(search.toLowerCase()) ||
      d.cliente.toLowerCase().includes(search.toLowerCase())
    const matchT = filtroTipo === 'Todos' || d.tipo === filtroTipo
    return matchS && matchT
  })

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Documentos</h1>
            <p>Archivo centralizado de pólizas, endosos y expedientes</p>
          </div>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" multiple style={{ display: 'none' }} />
            <span className="btn-primary">
              <Upload size={16} /> Subir archivos
            </span>
          </label>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false) }}
        style={{
          border: `2px dashed ${drag ? 'var(--gold)' : '#D0D8E4'}`,
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          marginBottom: '24px',
          background: drag ? 'var(--gold-pale)' : '#FAFBFC',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
      >
        <Upload size={28} color={drag ? 'var(--gold)' : 'var(--slate)'} style={{ margin: '0 auto 10px' }} />
        <div style={{ fontWeight: '600', color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: '15px' }}>
          {drag ? 'Soltar para subir' : 'Arrastrá archivos acá'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--slate)', marginTop: '4px' }}>
          PDF, imágenes, documentos Word y Excel
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={15} />
          <input placeholder="Buscar archivo o cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
              background: filtroTipo === t ? 'var(--navy)' : 'white',
              borderColor: filtroTipo === t ? 'var(--navy)' : '#D0D8E4',
              color: filtroTipo === t ? 'white' : 'var(--navy)',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Tamaño</th>
              <th>Subido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(d => {
              const ext = extColor[d.ext] || extColor.pdf
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', background: ext.bg, borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: ext.text }}>{ext.label}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{d.nombre}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{d.tipo}</span></td>
                  <td style={{ fontSize: '13px' }}>{d.cliente}</td>
                  <td style={{ fontSize: '13px', color: 'var(--slate)' }}>{d.tamanio}</td>
                  <td style={{ fontSize: '13px', color: 'var(--slate)' }}>{d.fecha}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }}>
                        <Download size={13} />
                      </button>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '12px', color: '#D94F4F', borderColor: '#FDEAEA' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
