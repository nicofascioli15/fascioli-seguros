'use client'
import { useState } from 'react'
import { Plus, Download, Search, CheckCircle } from 'lucide-react'

const estadoColor: Record<string, string> = { 'Cobrado': 'badge-success', 'Pendiente': 'badge-warning', 'Vencido': 'badge-danger' }

export default function PagosPage() {
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const pagosData: any[]    = []

  const filtrados = pagosData.filter(p => {
    const q = search.toLowerCase()
    return (!q || p.cliente?.toLowerCase().includes(q) || p.poliza?.toLowerCase().includes(q)) &&
           (filtro === 'Todos' || p.estado === filtro)
  })

  const total = (estado: string) => pagosData.filter(p => p.estado === estado).reduce((s, p) => s + (p.monto || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Pagos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Seguimiento de cobros y comisiones</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline"><Download size={14} /> Exportar</button>
          <button className="btn-primary"><Plus size={15} /> Registrar pago</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Cobrado este mes',   value: total('Cobrado'),   bg: '#E6F5EF', color: '#1A7A4E' },
          { label: 'Pendiente de cobro', value: total('Pendiente'), bg: '#FEF3C7', color: '#92400E' },
          { label: 'Vencido sin cobrar', value: total('Vencido'),   bg: '#FEE2E2', color: '#991B1B' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: s.color, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>${s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 260, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Todos','Cobrado','Pendiente','Vencido'].map(t => <button key={t} onClick={() => setFiltro(t)} className={`filter-btn ${filtro === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 180 }} />
            <col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 120 }} />
            <col style={{ width: 120 }} /><col style={{ width: 100 }} /><col style={{ width: 80 }} />
          </colgroup>
          <thead>
            <tr>
              <th>ID Pago</th><th>Póliza</th><th>Cliente</th><th>Aseguradora</th>
              <th>Monto</th><th>Vencimiento</th><th>Método</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pagos registrados</div>
                <div style={{ fontSize: 12 }}>Los pagos se registran desde el detalle de cada póliza en Clientes</div>
              </td></tr>
            ) : filtrados.map(p => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{p.id}</td>
                <td style={{ fontSize: 12, color: 'var(--slate)', fontFamily: 'monospace' }}>{p.poliza}</td>
                <td style={{ fontWeight: 600 }}>{p.cliente}</td>
                <td style={{ color: 'var(--slate)', fontSize: 13 }}>{p.aseguradora}</td>
                <td style={{ fontWeight: 700 }}>${p.monto?.toLocaleString()}</td>
                <td style={{ fontSize: 13, color: 'var(--slate)' }}>{p.vence}</td>
                <td style={{ fontSize: 13 }}>{p.metodo || '—'}</td>
                <td><span className={`badge ${estadoColor[p.estado] || 'badge-neutral'}`}>{p.estado}</span></td>
                <td>{p.estado !== 'Cobrado' && <button className="btn-primary btn-sm"><CheckCircle size={12} /> Cobrar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
