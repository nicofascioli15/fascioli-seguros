'use client'
import { TrendingUp, FileText, CreditCard, AlertTriangle, Bell, Users, CheckCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const pagosMes = [
  { mes: 'Ene', cobrado: 180000, pendiente: 24000 },
  { mes: 'Feb', cobrado: 195000, pendiente: 18000 },
  { mes: 'Mar', cobrado: 210000, pendiente: 31000 },
  { mes: 'Abr', cobrado: 188000, pendiente: 20000 },
  { mes: 'May', cobrado: 225000, pendiente: 15000 },
  { mes: 'Jun', cobrado: 198000, pendiente: 28000 },
]

const alertasVenc = [
  { id: 1, cliente: 'Rodríguez, M.', poliza: 'POL-00234', aseguradora: 'BSE', dias: 3, tipo: 'Hogar' },
  { id: 2, cliente: 'Pérez, A.', poliza: 'POL-00189', aseguradora: 'Mapfre', dias: 7, tipo: 'Auto' },
  { id: 3, cliente: 'López, G.', poliza: 'POL-00301', aseguradora: 'Surco', dias: 12, tipo: 'Vida' },
  { id: 4, cliente: 'García, F.', poliza: 'POL-00145', aseguradora: 'BSE', dias: 15, tipo: 'RC' },
]

const siniestrosRecientes = [
  { id: 'SIN-041', cliente: 'Martínez, R.', tipo: 'Choque', estado: 'En gestión', fecha: '04/06/2026' },
  { id: 'SIN-040', cliente: 'Torres, L.', tipo: 'Robo parcial', estado: 'Documentación', fecha: '01/06/2026' },
  { id: 'SIN-039', cliente: 'Fernández, C.', tipo: 'Granizo', estado: 'Cerrado', fecha: '28/05/2026' },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Resumen general del negocio · Junio 2026</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="label">Pólizas activas</div>
              <div className="value">347</div>
              <div className="trend">↑ 12 este mes</div>
            </div>
            <div style={{ background: '#E6F0FF', borderRadius: '10px', padding: '10px' }}>
              <FileText size={20} color="#2456B0" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="label">Cobrado en junio</div>
              <div className="value">$198k</div>
              <div className="trend">$28k pendiente</div>
            </div>
            <div style={{ background: '#E6F7F0', borderRadius: '10px', padding: '10px' }}>
              <CreditCard size={20} color="#2A7A56" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="label">Vencen en 30 días</div>
              <div className="value">18</div>
              <div className="trend" style={{ color: '#B5630A' }}>4 urgentes</div>
            </div>
            <div style={{ background: '#FFF4E5', borderRadius: '10px', padding: '10px' }}>
              <Bell size={20} color="#E08C2A" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="label">Siniestros abiertos</div>
              <div className="value">8</div>
              <div className="trend">2 sin novedad reciente</div>
            </div>
            <div style={{ background: '#FDEAEA', borderRadius: '10px', padding: '10px' }}>
              <AlertTriangle size={20} color="#D94F4F" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div style={{ fontWeight: '700', color: 'var(--navy)', marginBottom: '20px', fontSize: '15px' }}>
            Cobrado vs. pendiente (últimos 6 meses)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pagosMes} barGap={4}>
              <XAxis dataKey="mes" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
              <Tooltip formatter={(v) => typeof v === 'number' ? `$${v.toLocaleString()}` : v} />
              <Bar dataKey="cobrado" fill="var(--navy)" radius={[4,4,0,0]} name="Cobrado" />
              <Bar dataKey="pendiente" fill="var(--gold)" radius={[4,4,0,0]} name="Pendiente" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--navy)', borderRadius: '2px', display: 'inline-block' }} />
              Cobrado
            </span>
            <span style={{ fontSize: '12px', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--gold)', borderRadius: '2px', display: 'inline-block' }} />
              Pendiente
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontWeight: '700', color: 'var(--navy)', marginBottom: '16px', fontSize: '15px' }}>
            Próximos vencimientos
          </div>
          {alertasVenc.map(a => (
            <div key={a.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #F0F4FA'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)' }}>{a.cliente}</div>
                <div style={{ fontSize: '11px', color: 'var(--slate)' }}>{a.tipo} · {a.aseguradora}</div>
              </div>
              <span className={`badge ${a.dias <= 5 ? 'badge-danger' : a.dias <= 10 ? 'badge-warning' : 'badge-neutral'}`}>
                {a.dias}d
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="stat-card">
          <div style={{ fontWeight: '700', color: 'var(--navy)', marginBottom: '16px', fontSize: '15px' }}>
            Siniestros recientes
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Cliente', 'Tipo', 'Estado', 'Fecha'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: '11px', fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate)',
                    paddingBottom: '10px', borderBottom: '1px solid #F0F4FA' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siniestrosRecientes.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontWeight: '600', color: 'var(--navy)' }}>{s.id}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px' }}>{s.cliente}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px' }}>{s.tipo}</td>
                  <td style={{ padding: '10px 0' }}>
                    <span className={`badge ${s.estado === 'Cerrado' ? 'badge-success' : s.estado === 'En gestión' ? 'badge-blue' : 'badge-warning'}`}>
                      {s.estado}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0', fontSize: '12px', color: 'var(--slate)' }}>{s.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stat-card">
          <div style={{ fontWeight: '700', color: 'var(--navy)', marginBottom: '16px', fontSize: '15px' }}>
            Distribución de cartera
          </div>
          {[
            { tipo: 'Automotor', cant: 142, pct: 41, color: '#0F1E35' },
            { tipo: 'Hogar', cant: 89, pct: 26, color: '#C9A84C' },
            { tipo: 'Vida', cant: 61, pct: 18, color: '#4A80D4' },
            { tipo: 'RC / Otros', cant: 55, pct: 15, color: '#8A9BB5' },
          ].map(item => (
            <div key={item.tipo} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                <span style={{ fontWeight: '500' }}>{item.tipo}</span>
                <span style={{ color: 'var(--slate)' }}>{item.cant} pólizas · {item.pct}%</span>
              </div>
              <div style={{ background: '#EEF2F8', borderRadius: '4px', height: '6px' }}>
                <div style={{ background: item.color, width: `${item.pct}%`, height: '100%', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
