'use client'
import { useState } from 'react'
import { Plus, Search, AlertTriangle } from 'lucide-react'

const estadoColor: Record<string, string> = { 'En gestión': 'badge-blue', 'Documentación': 'badge-warning', 'Pericial': 'badge-neutral', 'Cerrado': 'badge-success' }

export default function SiniestrosPage() {
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const data: any[]         = []

  const filtrados = data.filter(s => {
    const q = search.toLowerCase()
    return (!q || s.cliente?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)) &&
           (filtro === 'Todos' || s.estado === filtro)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Siniestros</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Gestión y seguimiento de casos</p>
        </div>
        <button className="btn-primary"><Plus size={15} /> Nuevo siniestro</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o ID..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todos','En gestión','Documentación','Pericial','Cerrado'].map(t => <button key={t} onClick={() => setFiltro(t)} className={`filter-btn ${filtro === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>
      {filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay siniestros registrados</div>
          <div style={{ fontSize: 12 }}>Cuando surja un siniestro, registralo con el botón de arriba</div>
        </div>
      ) : filtrados.map(s => (
        <div key={s.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, background: '#FEE2E2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#D94F4F" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{s.id}</span>
                <span className={`badge ${estadoColor[s.estado] || 'badge-neutral'}`}>{s.estado}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{s.cliente}</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{s.poliza} · {s.tipo} · {s.aseguradora}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{s.descripcion}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Abierto</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{s.abierto}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
