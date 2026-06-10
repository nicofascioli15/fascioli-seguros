'use client'
import { useState } from 'react'
import { Plus, Search } from 'lucide-react'

const TIPOS = ['Todos', 'Automotor', 'Hogar', 'Vida', 'RC', 'Incendio', 'Multirriesgo', 'Otros']
const estadoColor: Record<string, string> = { 'Vigente': 'badge-success', 'Por vencer': 'badge-warning', 'Vencida': 'badge-danger' }

export default function PolizasPage() {
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const polizasData: any[]          = []

  const filtradas = polizasData.filter(p => {
    const q = search.toLowerCase()
    return (!q || p.cliente?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)) &&
           (filtroTipo === 'Todos' || p.tipo === filtroTipo)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Pólizas</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Gestión de toda la cartera de seguros</p>
        </div>
        <button className="btn-primary"><Plus size={15} /> Nueva póliza</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPOS.map(t => <button key={t} onClick={() => setFiltroTipo(t)} className={`filter-btn ${filtroTipo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 120 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} />
            <col style={{ width: 130 }} /><col style={{ width: 130 }} /><col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th>N° Póliza</th><th>Cliente</th><th>Tipo</th>
              <th>Aseguradora</th><th>Vencimiento</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pólizas cargadas</div>
                <div style={{ fontSize: 12 }}>Agregá pólizas desde el módulo Clientes</div>
              </td></tr>
            ) : filtradas.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{p.id}</td>
                <td style={{ fontWeight: 600 }}>{p.cliente}</td>
                <td><span className="badge badge-neutral">{p.tipo}</span></td>
                <td style={{ color: 'var(--slate)', fontSize: 13 }}>{p.aseguradora}</td>
                <td style={{ fontSize: 13, color: 'var(--slate)' }}>{p.vence}</td>
                <td><span className={`badge ${estadoColor[p.estado] || 'badge-neutral'}`}>{p.estado}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
