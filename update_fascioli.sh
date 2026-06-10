#!/bin/bash
set -e

echo "📁 Actualizando archivos..."

# ── globals.css ──────────────────────────────────────────────────────────────
cat > app/globals.css << 'EOF'
@import "tailwindcss";

:root {
  --navy:       #0F1E35;
  --navy-mid:   #162844;
  --navy-light: #1E3557;
  --gold:       #C9A84C;
  --gold-light: #E2C47A;
  --gold-pale:  #FBF5E6;
  --slate:      #8A9BB5;
  --slate-light:#B8C5D6;
  --surface:    #F4F7FB;
  --white:      #FFFFFF;
  --danger:     #D94F4F;
  --success:    #2E9668;
  --warning:    #D97706;
  --info:       #2563EB;
  --border:     #E2E8F0;
}

* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--surface); color: var(--navy); }

.app-shell { display: flex; min-height: 100vh; }
.main-content { flex: 1; padding: 32px; min-width: 0; }

.sidebar { background: var(--navy); width: 240px; min-height: 100vh; display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.sidebar-logo { padding: 24px 20px 18px; border-bottom: 1px solid rgba(201,168,76,.18); display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 36px; height: 36px; border-radius: 9px; background: rgba(201,168,76,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
.logo-text .brand { font-size: 16px; font-weight: 800; color: var(--gold); letter-spacing: .04em; text-transform: uppercase; }
.logo-text .sub   { font-size: 10px; color: var(--slate); letter-spacing: .1em; text-transform: uppercase; margin-top: 1px; }
.nav-section { padding: 16px 16px 6px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--slate); }
.nav-item { display: flex; align-items: center; gap: 9px; padding: 9px 14px; margin: 2px 8px; border-radius: 8px; color: var(--slate-light); font-size: 13.5px; font-weight: 500; cursor: pointer; transition: all .14s; border: none; background: none; width: calc(100% - 16px); text-align: left; text-decoration: none; }
.nav-item:hover { background: rgba(201,168,76,.1); color: var(--gold-light); }
.nav-item.active { background: rgba(201,168,76,.16); color: var(--gold); border-left: 2px solid var(--gold); margin-left: 6px; padding-left: 12px; }

.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
.page-header h1 { font-size: 22px; font-weight: 800; color: var(--navy); }
.page-header p  { font-size: 13px; color: var(--slate); margin-top: 3px; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: white; border-radius: 12px; padding: 18px 20px; border: 1px solid var(--border); }
.stat-card .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); margin-bottom: 6px; }
.stat-card .value { font-size: 26px; font-weight: 800; color: var(--navy); line-height: 1; }
.stat-card .sub   { font-size: 11.5px; color: var(--slate); margin-top: 4px; }

.btn-primary { background: var(--gold); color: var(--navy); font-weight: 700; font-size: 13px; padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer; transition: all .14s; display: inline-flex; align-items: center; gap: 5px; }
.btn-primary:hover { background: var(--gold-light); }
.btn-outline { background: white; color: var(--navy); font-weight: 600; font-size: 13px; padding: 9px 16px; border-radius: 8px; border: 1.5px solid var(--border); cursor: pointer; transition: all .14s; display: inline-flex; align-items: center; gap: 5px; }
.btn-outline:hover { border-color: var(--gold); color: var(--gold); }
.btn-sm { padding: 5px 12px !important; font-size: 12px !important; }

.filter-btn { padding: 8px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; border: 1.5px solid var(--border); background: white; color: var(--navy); cursor: pointer; transition: all .14s; }
.filter-btn.active { background: var(--navy); border-color: var(--navy); color: white; }
.filter-btn:hover:not(.active) { border-color: var(--gold); color: var(--gold); }

.table-card { background: white; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; }
.table-card table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.table-card thead th { background: #F8FAFC; padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table-card tbody tr { border-bottom: 1px solid #F1F5FB; transition: background .1s; }
.table-card tbody tr:last-child { border-bottom: none; }
.table-card tbody tr:hover { background: #F8FAFC; }
.table-card tbody td { padding: 13px 16px; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: .03em; white-space: nowrap; }
.badge-success { background: #E6F5EF; color: #1A7A4E; }
.badge-warning { background: #FEF3C7; color: #92400E; }
.badge-danger  { background: #FEE2E2; color: #991B1B; }
.badge-neutral { background: #EEF2F8; color: #4A5E78; }
.badge-blue    { background: #DBEAFE; color: #1E40AF; }
.badge-gold    { background: var(--gold-pale); color: #7A5800; }

.ramo-incendio    { background: #FEE2E2; color: #991B1B; }
.ramo-multirresgo { background: #DBEAFE; color: #1E40AF; }
.ramo-ascensores  { background: #F0FDF4; color: #166534; }
.ramo-inmuebles   { background: #FEF3C7; color: #92400E; }
.ramo-cristales   { background: #E0F2FE; color: #0C4A6E; }
.ramo-vehiculos   { background: #EDE9FE; color: #4C1D95; }
.ramo-rc          { background: #FDF4FF; color: #701A75; }

.edif-card { background: white; border-radius: 10px; border: 1.5px solid var(--border); padding: 14px 16px; cursor: pointer; transition: all .14s; display: flex; align-items: center; gap: 12px; }
.edif-card:hover { border-color: var(--gold); box-shadow: 0 2px 10px rgba(15,30,53,.07); }
.edif-avatar { width: 38px; height: 38px; border-radius: 9px; background: var(--navy); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: var(--gold); flex-shrink: 0; }
.edif-name { font-size: 13.5px; font-weight: 700; color: var(--navy); }
.edif-addr { font-size: 11.5px; color: var(--slate); margin-top: 1px; }
.edif-del-btn { color: var(--slate); font-size: 18px; padding: 4px 6px; border-radius: 6px; cursor: pointer; line-height: 1; transition: color .14s; background: none; border: none; display: flex; align-items: center; }
.edif-del-btn:hover { color: var(--danger); }

.poliza-card { background: white; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 12px; overflow: hidden; transition: box-shadow .14s; }
.poliza-card:hover { box-shadow: 0 2px 12px rgba(15,30,53,.08); }
.poliza-card-header { padding: 14px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
.ramo-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.poliza-id   { font-size: 11px; font-family: monospace; color: var(--slate); }
.poliza-ramo { font-weight: 700; font-size: 14px; }
.poliza-card-body { padding: 0 18px 16px; border-top: 1px solid var(--border); display: none; }
.poliza-card-body.open { display: block; padding-top: 14px; }
.poliza-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
.poliza-field .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); margin-bottom: 3px; }
.poliza-field .field-val   { font-size: 13.5px; font-weight: 500; color: var(--navy); }

.cuotas-section { margin-top: 14px; }
.cuotas-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--slate); margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.cuota-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; margin-bottom: 5px; border: 1.5px solid var(--border); background: white; transition: all .14s; }
.cuota-row.paid { background: #F0FDF8; border-color: #BBF7D0; }
.cuota-num { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.cuota-num.paid    { background: #E6F5EF; color: #1A7A4E; }
.cuota-num.pending { background: #EEF2F8; color: #4A5E78; }
.cuota-info { flex: 1; min-width: 0; }
.cuota-info .cuota-title { font-size: 13px; font-weight: 600; color: var(--navy); }
.cuota-info .cuota-sub   { font-size: 11.5px; color: var(--slate); margin-top: 1px; }
.cuota-paid-tag { font-size: 11px; font-weight: 700; color: #1A7A4E; background: #E6F5EF; padding: 3px 9px; border-radius: 10px; display: flex; align-items: center; gap: 4px; white-space: nowrap; }

.pago-overlay { position: fixed; inset: 0; background: rgba(15,30,53,.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0; pointer-events: none; transition: opacity .18s; }
.pago-overlay.open { opacity: 1; pointer-events: all; }
.pago-modal { background: white; border-radius: 16px; padding: 28px; width: 420px; max-width: 95vw; box-shadow: 0 24px 60px rgba(15,30,53,.22); transform: translateY(12px); transition: transform .18s; }
.pago-overlay.open .pago-modal { transform: translateY(0); }
.fgroup { margin-bottom: 14px; }
.fgroup label { display: block; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate); margin-bottom: 5px; }
.fgroup input, .fgroup select { width: 100%; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; color: var(--navy); outline: none; transition: border-color .14s; background: white; }
.fgroup input:focus, .fgroup select:focus { border-color: var(--gold); }

.upload-zone { border: 1.5px dashed var(--slate-light); border-radius: 8px; padding: 12px 16px; text-align: center; color: var(--slate); font-size: 12.5px; cursor: pointer; margin-top: 12px; transition: all .14s; }
.upload-zone:hover { border-color: var(--gold); color: var(--gold); background: var(--gold-pale); }

.pagination { display: flex; align-items: center; gap: 6px; margin-top: 14px; justify-content: flex-end; }
.pag-btn { padding: 5px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 600; border: 1.5px solid var(--border); background: white; cursor: pointer; color: var(--navy); }
.pag-btn.active { background: var(--navy); color: white; border-color: var(--navy); }
EOF

echo "✅ globals.css"

# ── dashboard ────────────────────────────────────────────────────────────────
cat > app/dashboard/page.tsx << 'EOF'
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
EOF
echo "✅ dashboard"

# ── polizas ──────────────────────────────────────────────────────────────────
cat > app/polizas/page.tsx << 'EOF'
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
EOF
echo "✅ polizas"

# ── pagos ────────────────────────────────────────────────────────────────────
cat > app/pagos/page.tsx << 'EOF'
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
EOF
echo "✅ pagos"

# ── documentos ───────────────────────────────────────────────────────────────
cat > app/documentos/page.tsx << 'EOF'
'use client'
import { useState, useRef } from 'react'
import { Upload, Download, Trash2, Search } from 'lucide-react'

const TIPOS = ['Todos', 'Póliza', 'Endoso', 'Siniestro', 'Identificación', 'Cobro', 'Otros']
const extStyle: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: '#FEE2E2', color: '#991B1B', label: 'PDF' },
  jpg:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  jpeg: { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  png:  { bg: '#DBEAFE', color: '#1E40AF', label: 'IMG' },
  docx: { bg: '#FEF3C7', color: '#92400E', label: 'DOC' },
  xlsx: { bg: '#E6F5EF', color: '#1A7A4E', label: 'XLS' },
}

export default function DocumentosPage() {
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [drag, setDrag]             = useState(false)
  const inputRef                    = useRef<HTMLInputElement>(null)
  const docs: any[]                 = []

  const filtrados = docs.filter(d => {
    const q = search.toLowerCase()
    return (!q || d.nombre?.toLowerCase().includes(q) || d.cliente?.toLowerCase().includes(q)) &&
           (filtroTipo === 'Todos' || d.tipo === filtroTipo)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Documentos</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Archivo centralizado de pólizas, endosos y expedientes</p>
        </div>
        <button className="btn-primary" onClick={() => inputRef.current?.click()}><Upload size={14} /> Subir archivos</button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} />
      </div>
      <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false) }} onClick={() => inputRef.current?.click()}
        style={{ border: `2px dashed ${drag ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12, padding: '28px 24px', textAlign: 'center', marginBottom: 24, background: drag ? 'var(--gold-pale)' : '#FAFBFC', transition: 'all .2s', cursor: 'pointer' }}>
        <Upload size={24} style={{ margin: '0 auto 8px', color: drag ? 'var(--gold)' : 'var(--slate)', display: 'block' }} />
        <div style={{ fontWeight: 600, color: drag ? 'var(--gold)' : 'var(--navy)', fontSize: 14 }}>{drag ? 'Soltá para subir' : 'Arrastrá archivos acá'}</div>
        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>PDF, JPG, PNG, Word, Excel</div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar archivo o cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPOS.map(t => <button key={t} onClick={() => setFiltroTipo(t)} className={`filter-btn ${filtroTipo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 52 }} /><col /><col style={{ width: 130 }} />
            <col style={{ width: 180 }} /><col style={{ width: 90 }} /><col style={{ width: 110 }} /><col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr><th></th><th>Archivo</th><th>Tipo</th><th>Cliente</th><th>Tamaño</th><th>Subido</th><th></th></tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay documentos subidos</div>
                <div style={{ fontSize: 12 }}>Arrastrá archivos arriba o usá el botón "Subir archivos"</div>
              </td></tr>
            ) : filtrados.map((d, i) => {
              const ext = extStyle[d.nombre?.split('.').pop()?.toLowerCase() || ''] || extStyle.pdf
              return (
                <tr key={i}>
                  <td><div style={{ width: 36, height: 36, background: ext.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 800, color: ext.color }}>{ext.label}</span></div></td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{d.nombre}</td>
                  <td><span className="badge badge-neutral">{d.tipo}</span></td>
                  <td style={{ fontSize: 13 }}>{d.cliente}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{d.tamanio}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{d.fecha}</td>
                  <td><div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-outline btn-sm"><Download size={13} /></button>
                    <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }}><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
EOF
echo "✅ documentos"

# ── siniestros ───────────────────────────────────────────────────────────────
cat > app/siniestros/page.tsx << 'EOF'
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
EOF
echo "✅ siniestros"

# ── vencimientos ─────────────────────────────────────────────────────────────
cat > app/vencimientos/page.tsx << 'EOF'
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
EOF
echo "✅ vencimientos"

echo ""
echo "🎉 Todos los archivos actualizados. Ahora:"
echo "   git add ."
echo "   git commit -m 'fix: columnas, datos limpios, mejoras visuales'"
echo "   git push"
