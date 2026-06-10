'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'

export default function VencimientosPage() {
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState(90)
  const data: any[]         = []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Vencimientos</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Pólizas ordenadas por proximidad de vencimiento</p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 260, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{l:'30 días',v:30},{l:'90 días',v:90},{l:'180 días',v:180},{l:'Vencidas',v:0}].map(t =>
            <button key={t.v} onClick={() => setFiltro(t.v)} className={`filter-btn ${filtro === t.v ? 'active' : ''}`}>{t.l}</button>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay vencimientos próximos</div>
        <div style={{ fontSize: 12 }}>Los vencimientos se calculan automáticamente desde las pólizas cargadas</div>
      </div>
    </div>
  )
}
