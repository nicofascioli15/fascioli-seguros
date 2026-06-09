'use client'
import { useState } from 'react'
import { Plus, Search, FileText, Filter } from 'lucide-react'

const polizasData = [
  { id: 'POL-00347', cliente: 'Rodríguez, María', tipo: 'Automotor', aseguradora: 'BSE', prima: 4800, estado: 'Vigente', vence: '15/12/2026', placa: 'SBM 3421' },
  { id: 'POL-00346', cliente: 'Pérez, Andrés', tipo: 'Hogar', aseguradora: 'Mapfre', prima: 2100, estado: 'Vigente', vence: '01/09/2026', placa: '-' },
  { id: 'POL-00345', cliente: 'López, Gabriela', tipo: 'Vida', aseguradora: 'Sura', prima: 1850, estado: 'Vigente', vence: '20/03/2027', placa: '-' },
  { id: 'POL-00344', cliente: 'García, Federico', tipo: 'RC', aseguradora: 'BSE', prima: 980, estado: 'Por vencer', vence: '15/06/2026', placa: '-' },
  { id: 'POL-00343', cliente: 'Martínez, Roberto', tipo: 'Automotor', aseguradora: 'Surco', prima: 5200, estado: 'Vigente', vence: '10/11/2026', placa: 'TUV 8832' },
  { id: 'POL-00342', cliente: 'Torres, Laura', tipo: 'Hogar', aseguradora: 'Mapfre', prima: 1700, estado: 'Vigente', vence: '05/08/2026', placa: '-' },
  { id: 'POL-00341', cliente: 'Fernández, Carlos', tipo: 'Automotor', aseguradora: 'BSE', prima: 4200, estado: 'Vencida', vence: '28/05/2026', placa: 'ACM 1123' },
  { id: 'POL-00340', cliente: 'Díaz, Patricia', tipo: 'Vida', aseguradora: 'Sura', prima: 2400, estado: 'Vigente', vence: '14/02/2027', placa: '-' },
]

const estadoColor: Record<string, string> = {
  'Vigente': 'badge-success',
  'Por vencer': 'badge-warning',
  'Vencida': 'badge-danger',
}

export default function PolizasPage() {
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [showModal, setShowModal] = useState(false)

  const filtradas = polizasData.filter(p => {
    const matchSearch = p.cliente.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
    const matchTipo = filtroTipo === 'Todos' || p.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Pólizas</h1>
            <p>Gestión de toda la cartera de seguros</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nueva póliza
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={15} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'Automotor', 'Hogar', 'Vida', 'RC'].map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: filtroTipo === t ? 'var(--navy)' : 'white',
                borderColor: filtroTipo === t ? 'var(--navy)' : '#D0D8E4',
                color: filtroTipo === t ? 'white' : 'var(--navy)',
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: polizasData.length, color: '#EEF2F8', text: 'var(--navy)' },
          { label: 'Vigentes', value: polizasData.filter(p => p.estado === 'Vigente').length, color: '#E6F7F0', text: '#2A7A56' },
          { label: 'Por vencer', value: polizasData.filter(p => p.estado === 'Por vencer').length, color: '#FFF4E5', text: '#B5630A' },
          { label: 'Vencidas', value: polizasData.filter(p => p.estado === 'Vencida').length, color: '#FDEAEA', text: '#B03030' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.color, borderRadius: '8px', padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '18px', fontWeight: '700', color: s.text }}>{s.value}</span>
            <span style={{ fontSize: '12px', color: s.text, opacity: 0.8 }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>N° Póliza</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Aseguradora</th>
              <th>Prima anual</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: '600', color: 'var(--navy)', fontFamily: 'monospace', fontSize: '13px' }}>{p.id}</td>
                <td>{p.cliente}</td>
                <td>
                  <span className="badge badge-neutral">{p.tipo}</span>
                </td>
                <td style={{ color: 'var(--slate)', fontSize: '13px' }}>{p.aseguradora}</td>
                <td style={{ fontWeight: '600' }}>${p.prima.toLocaleString()}</td>
                <td style={{ fontSize: '13px', color: 'var(--slate)' }}>{p.vence}</td>
                <td><span className={`badge ${estadoColor[p.estado]}`}>{p.estado}</span></td>
                <td>
                  <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Nueva póliza</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group"><label>Cliente</label><input placeholder="Nombre del asegurado" /></div>
              <div className="form-group"><label>N° Póliza</label><input placeholder="POL-XXXXX" /></div>
              <div className="form-group">
                <label>Tipo de seguro</label>
                <select><option>Automotor</option><option>Hogar</option><option>Vida</option><option>RC</option><option>Otros</option></select>
              </div>
              <div className="form-group"><label>Aseguradora</label><input placeholder="BSE, Mapfre, Sura..." /></div>
              <div className="form-group"><label>Prima anual ($)</label><input type="number" placeholder="0" /></div>
              <div className="form-group"><label>Fecha de vencimiento</label><input type="date" /></div>
            </div>
            <div className="form-group"><label>Notas</label><textarea rows={3} placeholder="Observaciones..." /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary">Guardar póliza</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
