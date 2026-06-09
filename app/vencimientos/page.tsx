'use client'
import { useState } from 'react'
import { Bell, Phone, Mail } from 'lucide-react'

const vencimientosData = [
  { id: 'POL-00344', cliente: 'García, Federico', tipo: 'RC', aseguradora: 'BSE', telefono: '099 123 456', email: 'garcia@mail.com', dias: 3, prima: 980, notificado: false },
  { id: 'POL-00346', cliente: 'Pérez, Andrés', tipo: 'Hogar', aseguradora: 'Mapfre', telefono: '098 654 321', email: 'perez@mail.com', dias: 7, prima: 2100, notificado: true },
  { id: 'POL-00301', cliente: 'López, Gabriela', tipo: 'Vida', aseguradora: 'Sura', telefono: '091 222 333', email: 'lopez@mail.com', dias: 12, prima: 1850, notificado: false },
  { id: 'POL-00145', cliente: 'García Otro, F.', tipo: 'Automotor', aseguradora: 'BSE', telefono: '099 444 555', email: 'otro@mail.com', dias: 15, prima: 4200, notificado: false },
  { id: 'POL-00290', cliente: 'Silva, Marta', tipo: 'Hogar', aseguradora: 'Mapfre', telefono: '097 888 999', email: 'silva@mail.com', dias: 18, prima: 1650, notificado: true },
  { id: 'POL-00278', cliente: 'Benítez, Julio', tipo: 'Automotor', aseguradora: 'Surco', telefono: '094 111 222', email: 'benitez@mail.com', dias: 22, prima: 5800, notificado: false },
  { id: 'POL-00265', cliente: 'Acosta, Carmen', tipo: 'Vida', aseguradora: 'Sura', telefono: '099 777 666', email: 'acosta@mail.com', dias: 27, prima: 2200, notificado: false },
]

export default function VencimientosPage() {
  const [notificados, setNotificados] = useState<Record<string, boolean>>(
    Object.fromEntries(vencimientosData.map(v => [v.id, v.notificado]))
  )

  const urgentes = vencimientosData.filter(v => v.dias <= 7)
  const proximos = vencimientosData.filter(v => v.dias > 7 && v.dias <= 15)
  const planificados = vencimientosData.filter(v => v.dias > 15)

  const Section = ({ title, items, color }: { title: string, items: typeof vencimientosData, color: string }) => (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--navy)' }}>{title}</h2>
        <span style={{ fontSize: '12px', color: 'var(--slate)', background: '#EEF2F8', padding: '2px 8px', borderRadius: '10px' }}>{items.length}</span>
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {items.map(v => (
          <div key={v.id} className="stat-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: v.dias <= 7 ? '#FDEAEA' : v.dias <= 15 ? '#FFF4E5' : '#EEF2F8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: v.dias <= 7 ? '#D94F4F' : v.dias <= 15 ? '#E08C2A' : 'var(--navy)', lineHeight: 1 }}>{v.dias}</span>
                  <span style={{ fontSize: '9px', color: 'var(--slate)', fontWeight: '600', textTransform: 'uppercase' }}>días</span>
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '15px' }}>{v.cliente}</div>
                  <div style={{ fontSize: '12px', color: 'var(--slate)', marginTop: '2px' }}>
                    {v.id} · {v.tipo} · {v.aseguradora} · Prima: ${v.prima.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {notificados[v.id] && (
                  <span className="badge badge-success">Notificado</span>
                )}
                <a href={`tel:${v.telefono}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>
                  <Phone size={13} /> Llamar
                </a>
                <a href={`mailto:${v.email}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>
                  <Mail size={13} /> Email
                </a>
                <button
                  className={notificados[v.id] ? 'btn-secondary' : 'btn-primary'}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => setNotificados(prev => ({ ...prev, [v.id]: true }))}
                >
                  <Bell size={13} /> {notificados[v.id] ? 'Reenviar' : 'Notificar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1>Vencimientos</h1>
        <p>Pólizas próximas a vencer en los próximos 30 días</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Urgentes (≤ 7 días)', count: urgentes.length, color: '#FDEAEA', text: '#B03030' },
          { label: 'Próximos (8–15 días)', count: proximos.length, color: '#FFF4E5', text: '#B5630A' },
          { label: 'Planificados (16–30 días)', count: planificados.length, color: '#EEF2F8', text: 'var(--navy)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.color, borderRadius: '10px', padding: '12px 20px' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: s.text }}>{s.count}</div>
            <div style={{ fontSize: '12px', color: s.text, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {urgentes.length > 0 && <Section title="Urgentes — vencen en 7 días o menos" items={urgentes} color="#D94F4F" />}
      {proximos.length > 0 && <Section title="Próximos — 8 a 15 días" items={proximos} color="#E08C2A" />}
      {planificados.length > 0 && <Section title="Planificados — 16 a 30 días" items={planificados} color="#4A80D4" />}
    </div>
  )
}
