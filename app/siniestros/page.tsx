'use client'
import { useState } from 'react'
import { Plus, Search, AlertTriangle } from 'lucide-react'

const siniestrosData = [
  { id: 'SIN-041', poliza: 'POL-00343', cliente: 'Martínez, Roberto', tipo: 'Choque', aseguradora: 'Surco', estado: 'En gestión', abierto: '04/06/2026', descripcion: 'Colisión trasera en Av. Italia. Daños en paragolpes y portamaleta.' },
  { id: 'SIN-040', poliza: 'POL-00347', cliente: 'Rodríguez, María', tipo: 'Robo parcial', aseguradora: 'BSE', estado: 'Documentación', abierto: '01/06/2026', descripcion: 'Robo de accesorios del interior del vehículo en estacionamiento.' },
  { id: 'SIN-039', poliza: 'POL-00342', cliente: 'Torres, Laura', tipo: 'Granizo', aseguradora: 'Mapfre', estado: 'Cerrado', abierto: '28/05/2026', descripcion: 'Daños en techo por granizo. Indemnización abonada.' },
  { id: 'SIN-038', poliza: 'POL-00346', cliente: 'Pérez, Andrés', tipo: 'Incendio', aseguradora: 'Mapfre', estado: 'Pericial', abierto: '20/05/2026', descripcion: 'Incendio en cocina. Perito asignado por la compañía.' },
  { id: 'SIN-037', poliza: 'POL-00345', cliente: 'López, Gabriela', tipo: 'Fallecimiento', aseguradora: 'Sura', estado: 'Cerrado', abierto: '10/05/2026', descripcion: 'Siniestro de vida. Trámite completado con herederos.' },
  { id: 'SIN-036', poliza: 'POL-00340', cliente: 'Díaz, Patricia', tipo: 'Responsabilidad Civil', aseguradora: 'Sura', estado: 'En gestión', abierto: '05/05/2026', descripcion: 'Daños a tercero. Proceso judicial iniciado.' },
]

const estadoColor: Record<string, string> = {
  'En gestión': 'badge-blue',
  'Documentación': 'badge-warning',
  'Pericial': 'badge-neutral',
  'Cerrado': 'badge-success',
}

export default function SiniestrosPage() {
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [showModal, setShowModal] = useState(false)

  const filtrados = siniestrosData.filter(s => {
    const matchS = s.cliente.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
    const matchF = filtro === 'Todos' || s.estado === filtro
    return matchS && matchF
  })

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Siniestros</h1>
            <p>Gestión y seguimiento de casos</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nuevo siniestro
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={15} />
          <input placeholder="Buscar por cliente o ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'En gestión', 'Documentación', 'Pericial', 'Cerrado'].map(t => (
            <button key={t} onClick={() => setFiltro(t)} style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
              background: filtro === t ? 'var(--navy)' : 'white',
              borderColor: filtro === t ? 'var(--navy)' : '#D0D8E4',
              color: filtro === t ? 'white' : 'var(--navy)',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {filtrados.map(s => (
          <div key={s.id} className="stat-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '44px', height: '44px', background: '#FDEAEA', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <AlertTriangle size={20} color="#D94F4F" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '14px', color: 'var(--navy)' }}>{s.id}</span>
                    <span className={`badge ${estadoColor[s.estado]}`}>{s.estado}</span>
                  </div>
                  <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '16px', marginTop: '4px' }}>{s.cliente}</div>
                  <div style={{ fontSize: '13px', color: 'var(--slate)', marginTop: '2px' }}>
                    {s.poliza} · {s.tipo} · {s.aseguradora}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--navy)', marginTop: '8px' }}>{s.descripcion}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Abierto</div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px' }}>{s.abierto}</div>
                <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px', marginTop: '10px' }}>
                  Ver detalle
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Nuevo siniestro</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group"><label>N° Póliza</label><input placeholder="POL-XXXXX" /></div>
              <div className="form-group"><label>Cliente</label><input placeholder="Nombre" /></div>
              <div className="form-group">
                <label>Tipo de siniestro</label>
                <select><option>Choque</option><option>Robo</option><option>Robo parcial</option><option>Granizo</option><option>Incendio</option><option>Responsabilidad Civil</option><option>Fallecimiento</option><option>Otro</option></select>
              </div>
              <div className="form-group"><label>Fecha de ocurrencia</label><input type="date" /></div>
            </div>
            <div className="form-group"><label>Descripción</label><textarea rows={4} placeholder="Descripción detallada del siniestro..." /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary">Abrir siniestro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
