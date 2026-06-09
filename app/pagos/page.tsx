'use client'
import { useState } from 'react'
import { Plus, Search, Download, CheckCircle } from 'lucide-react'

const pagosData = [
  { id: 'PAG-0891', poliza: 'POL-00347', cliente: 'Rodríguez, María', aseguradora: 'BSE', monto: 4800, vence: '01/06/2026', estado: 'Cobrado', metodo: 'Transferencia' },
  { id: 'PAG-0890', poliza: 'POL-00346', cliente: 'Pérez, Andrés', aseguradora: 'Mapfre', monto: 2100, vence: '01/06/2026', estado: 'Cobrado', metodo: 'Efectivo' },
  { id: 'PAG-0889', poliza: 'POL-00344', cliente: 'García, Federico', aseguradora: 'BSE', monto: 980, vence: '05/06/2026', estado: 'Pendiente', metodo: '-' },
  { id: 'PAG-0888', poliza: 'POL-00345', cliente: 'López, Gabriela', aseguradora: 'Sura', monto: 1850, vence: '10/06/2026', estado: 'Pendiente', metodo: '-' },
  { id: 'PAG-0887', poliza: 'POL-00343', cliente: 'Martínez, Roberto', aseguradora: 'Surco', monto: 5200, vence: '15/06/2026', estado: 'Pendiente', metodo: '-' },
  { id: 'PAG-0886', poliza: 'POL-00341', cliente: 'Fernández, Carlos', aseguradora: 'BSE', monto: 4200, vence: '28/05/2026', estado: 'Vencido', metodo: '-' },
  { id: 'PAG-0885', poliza: 'POL-00342', cliente: 'Torres, Laura', aseguradora: 'Mapfre', monto: 1700, vence: '20/05/2026', estado: 'Cobrado', metodo: 'Débito' },
  { id: 'PAG-0884', poliza: 'POL-00340', cliente: 'Díaz, Patricia', aseguradora: 'Sura', monto: 2400, vence: '18/05/2026', estado: 'Cobrado', metodo: 'Transferencia' },
]

const estadoColor: Record<string, string> = {
  'Cobrado': 'badge-success',
  'Pendiente': 'badge-warning',
  'Vencido': 'badge-danger',
}

export default function PagosPage() {
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')

  const filtrados = pagosData.filter(p => {
    const matchS = p.cliente.toLowerCase().includes(search.toLowerCase()) || p.poliza.toLowerCase().includes(search.toLowerCase())
    const matchF = filtro === 'Todos' || p.estado === filtro
    return matchS && matchF
  })

  const totalCobrado = pagosData.filter(p => p.estado === 'Cobrado').reduce((s, p) => s + p.monto, 0)
  const totalPendiente = pagosData.filter(p => p.estado === 'Pendiente').reduce((s, p) => s + p.monto, 0)
  const totalVencido = pagosData.filter(p => p.estado === 'Vencido').reduce((s, p) => s + p.monto, 0)

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Pagos</h1>
            <p>Seguimiento de cobros y comisiones</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary"><Download size={15} /> Exportar</button>
            <button className="btn-primary"><Plus size={16} /> Registrar pago</button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Cobrado este mes', value: totalCobrado, color: '#E6F7F0', text: '#2A7A56', icon: '✓' },
          { label: 'Pendiente de cobro', value: totalPendiente, color: '#FFF4E5', text: '#B5630A', icon: '⏱' },
          { label: 'Vencido sin cobrar', value: totalVencido, color: '#FDEAEA', text: '#B03030', icon: '!' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ background: s.color, border: 'none' }}>
            <div className="label" style={{ color: s.text }}>{s.label}</div>
            <div className="value" style={{ color: s.text, fontSize: '24px' }}>
              ${s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={15} />
          <input placeholder="Buscar cliente o póliza..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'Cobrado', 'Pendiente', 'Vencido'].map(t => (
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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID Pago</th>
              <th>Póliza</th>
              <th>Cliente</th>
              <th>Aseguradora</th>
              <th>Monto</th>
              <th>Vencimiento</th>
              <th>Método</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '13px' }}>{p.id}</td>
                <td style={{ color: 'var(--slate)', fontSize: '13px' }}>{p.poliza}</td>
                <td>{p.cliente}</td>
                <td style={{ color: 'var(--slate)', fontSize: '13px' }}>{p.aseguradora}</td>
                <td style={{ fontWeight: '700', color: 'var(--navy)' }}>${p.monto.toLocaleString()}</td>
                <td style={{ fontSize: '13px', color: 'var(--slate)' }}>{p.vence}</td>
                <td style={{ fontSize: '13px' }}>{p.metodo}</td>
                <td><span className={`badge ${estadoColor[p.estado]}`}>{p.estado}</span></td>
                <td>
                  {p.estado !== 'Cobrado' && (
                    <button className="btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }}>
                      <CheckCircle size={13} /> Cobrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
