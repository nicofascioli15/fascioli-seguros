'use client'
import { FileText, CreditCard, Bell, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    { label: 'Pólizas activas',     value: '—', sub: 'Sin datos aún',        icon: FileText,      bg: '#EEF2F8', iconColor: '#2456B0' },
    { label: 'Cobrado este mes',    value: '—', sub: 'Sin pagos registrados', icon: CreditCard,    bg: '#E6F5EF', iconColor: '#2A7A56' },
    { label: 'Vencen en 30 días',   value: '—', sub: 'Sin pólizas cargadas',  icon: Bell,          bg: '#FEF3C7', iconColor: '#D97706' },
    { label: 'Siniestros abiertos', value: '—', sub: 'Sin siniestros',        icon: AlertTriangle, bg: '#FEE2E2', iconColor: '#D94F4F' },
  ]
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
          Resumen general · {new Date().toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="label">{s.label}</div>
                <div className="value">{s.value}</div>
                <div className="sub">{s.sub}</div>
              </div>
              <div style={{ background: s.bg, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <s.icon size={20} color={s.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '48px 32px', textAlign: 'center', color: 'var(--slate)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Sistema listo para usar</div>
        <div style={{ fontSize: 13, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          Empezá agregando clientes y sus pólizas desde el módulo <strong>Clientes</strong>.
          El dashboard se completa automáticamente con los datos reales.
        </div>
        <a href="/clientes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, background: 'var(--gold)', color: 'var(--navy)', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
          Ir a Clientes →
        </a>
      </div>
    </div>
  )
}
