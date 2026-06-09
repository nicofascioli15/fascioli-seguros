'use client'
import { useState } from 'react'
import { ArrowLeft, Plus, X, ChevronRight } from 'lucide-react'

type Poliza = {
  ramo: string
  compania: string
  poliza: string
  vencimiento: string | null
  corredor: string
  moneda: string
  cuotas: number
  cuota_mes: string
  ultima_cuota: string | null
  pagos?: Record<number, { fecha: string; metodo: string; ref: string }>
}

type Props = {
  nombre: string
  onBack: () => void
}

const RAMOS = ['Incendio', 'Multirriesgo', 'Ascensores', 'Cristales', 'Inmuebles', 'Vehículos', 'RC', 'Vida', 'Otros']
const COMPANIAS = ['BSE', 'SURA', 'Mapfre', 'HDI', 'BERKLEY', 'BARBUSS', 'PORTO/SEG', 'SBI', 'Otra']
const METODOS = ['Transferencia', 'Efectivo', 'Débito automático', 'Cheque', 'Pago online']

function diasHasta(str: string | null): number | null {
  if (!str) return null
  const s = str.trim()
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  const d = new Date(+m[3], +m[2] - 1, +m[1])
  const hoy = new Date(2026, 5, 9)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function estadoBadge(venc: string | null) {
  const d = diasHasta(venc)
  if (d === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (d < 0) return { label: 'Vencida', cls: 'badge-danger' }
  if (d <= 30) return { label: `${d}d`, cls: 'badge-danger' }
  if (d <= 90) return { label: `${d}d`, cls: 'badge-warning' }
  return { label: venc!, cls: 'badge-success' }
}

function ramoDot(ramo: string) {
  const map: Record<string, string> = {
    'Incendio': '#D94F4F', 'Multirriesgo': '#2563EB', 'Ascensores': '#16A34A',
    'Inmuebles': '#D97706', 'Inuembles': '#D97706', 'Cristales': '#0284C7',
    'Vehículos': '#7C3AED', 'Vehiculos': '#7C3AED', 'RC': '#9333EA', 'RC Corredores': '#9333EA'
  }
  return map[ramo] || '#8A9BB5'
}

export default function ClienteDetalle({ nombre, onBack }: Props) {
  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [openCards, setOpenCards] = useState<Record<number, boolean>>({})
  const [showPolizaModal, setShowPolizaModal] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState<{ polizaIdx: number; cuotaNum: number } | null>(null)
  const [polizaForm, setPolizaForm] = useState({ ramo: 'Incendio', compania: 'BSE', poliza: '', vencimiento: '', corredor: 'Fascioli', moneda: 'U$S', cuotas: '', cuota_mes: '' })
  const [pagoForm, setPagoForm] = useState({ fecha: '2026-06-09', metodo: 'Transferencia', ref: '' })

  function toggleCard(idx: number) {
    setOpenCards(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  function guardarPoliza() {
    if (!polizaForm.poliza.trim()) return
    const venc = polizaForm.vencimiento
      ? (() => { const [y, m, d] = polizaForm.vencimiento.split('-'); return `${d}/${m}/${y}` })()
      : null
    setPolizas(prev => [...prev, {
      ...polizaForm,
      vencimiento: venc,
      cuotas: parseInt(polizaForm.cuotas) || 0,
      ultima_cuota: null,
      pagos: {}
    }])
    setShowPolizaModal(false)
    setPolizaForm({ ramo: 'Incendio', compania: 'BSE', poliza: '', vencimiento: '', corredor: 'Fascioli', moneda: 'U$S', cuotas: '', cuota_mes: '' })
  }

  function registrarPago() {
    if (!showPagoModal) return
    const { polizaIdx, cuotaNum } = showPagoModal
    setPolizas(prev => prev.map((p, i) => i === polizaIdx
      ? { ...p, pagos: { ...p.pagos, [cuotaNum]: pagoForm } }
      : p
    ))
    setShowPagoModal(null)
  }

  function deshacerPago(polizaIdx: number, cuotaNum: number) {
    setPolizas(prev => prev.map((p, i) => {
      if (i !== polizaIdx) return p
      const newPagos = { ...p.pagos }
      delete newPagos[cuotaNum]
      return { ...p, pagos: newPagos }
    }))
  }

  const vencidas = polizas.filter(p => { const d = diasHasta(p.vencimiento); return d !== null && d < 0 }).length

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>{nombre}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowPolizaModal(true)}>
          <Plus size={15} /> Nueva póliza
        </button>
      </div>

      {/* Back */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={14} /> Volver a clientes
      </button>

      {/* Cliente info card */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{nombre}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: '8px 14px', background: '#EEF2F8', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{polizas.length}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)' }}>Pólizas</div>
          </div>
          {vencidas > 0 && (
            <div style={{ textAlign: 'center', padding: '8px 14px', background: '#FEE2E2', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#991B1B' }}>{vencidas}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#991B1B' }}>Vencidas</div>
            </div>
          )}
        </div>
      </div>

      {/* Pólizas */}
      {polizas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <p style={{ fontSize: 14 }}>Este cliente no tiene pólizas aún.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowPolizaModal(true)}>
            <Plus size={14} /> Agregar primera póliza
          </button>
        </div>
      )}

      {polizas.map((pol, idx) => {
        const { label, cls } = estadoBadge(pol.vencimiento)
        const cuotasN = pol.cuotas || 0
        const pagosCount = Object.keys(pol.pagos || {}).length
        const pct = cuotasN > 0 ? Math.round(pagosCount / cuotasN * 100) : 0
        const isOpen = openCards[idx]

        return (
          <div key={idx} className="poliza-card">
            <div className="poliza-card-header" onClick={() => toggleCard(idx)}>
              <div className="ramo-dot" style={{ background: ramoDot(pol.ramo) }} />
              <div>
                <div className="poliza-ramo">{pol.ramo}</div>
                <div className="poliza-id">{pol.poliza}</div>
              </div>
              <div style={{ flex: 1 }} />
              <span className={`badge ${pol.ramo.toLowerCase().includes('incendio') ? 'ramo-incendio' : pol.ramo.toLowerCase().includes('multi') ? 'ramo-multirresgo' : pol.ramo.toLowerCase().includes('ascensor') ? 'ramo-ascensores' : 'badge-neutral'}`} style={{ marginRight: 8 }}>{pol.compania}</span>
              <span className={`badge ${cls}`}>{label}</span>
              <ChevronRight size={16} style={{ marginLeft: 10, color: 'var(--slate)', transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : '' }} />
            </div>

            {isOpen && (
              <div className="poliza-card-body open">
                <div className="poliza-grid">
                  <div className="poliza-field"><div className="field-label">N° Póliza</div><div className="field-val" style={{ fontFamily: 'monospace' }}>{pol.poliza}</div></div>
                  <div className="poliza-field"><div className="field-label">Vencimiento</div><div className="field-val">{pol.vencimiento || 'Sin fecha'}</div></div>
                  <div className="poliza-field"><div className="field-label">Moneda</div><div className="field-val">{pol.moneda}</div></div>
                  <div className="poliza-field"><div className="field-label">Corredor</div><div className="field-val">{pol.corredor}</div></div>
                  <div className="poliza-field"><div className="field-label">Cuotas</div><div className="field-val">{pol.cuotas || '—'}</div></div>
                  <div className="poliza-field"><div className="field-label">Cuota y mes</div><div className="field-val" style={{ fontSize: 12 }}>{pol.cuota_mes || '—'}</div></div>
                </div>

                {/* Cuotas */}
                {cuotasN > 0 && (
                  <div className="cuotas-section">
                    <div className="cuotas-label">
                      <span>Cuotas <span style={{ fontWeight: 400, color: 'var(--slate)' }}>({pagosCount}/{cuotasN} pagadas)</span></span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? 'var(--success)' : 'var(--slate)' }}>{pct}%</span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, marginBottom: 12 }}>
                      <div style={{ background: pct === 100 ? 'var(--success)' : 'var(--gold)', height: '100%', borderRadius: 4, width: `${pct}%`, transition: 'width .4s' }} />
                    </div>
                    {Array.from({ length: cuotasN }, (_, k) => k + 1).map(n => {
                      const pago = pol.pagos?.[n]
                      return (
                        <div key={n} className={`cuota-row ${pago ? 'paid' : ''}`}>
                          <div className={`cuota-num ${pago ? 'paid' : 'pending'}`}>{n}</div>
                          <div className="cuota-info">
                            <div className="cuota-title">Cuota {n} de {cuotasN}</div>
                            {pago
                              ? <div className="cuota-sub">✓ {pago.fecha} · {pago.metodo}{pago.ref ? ` · Ref: ${pago.ref}` : ''}</div>
                              : <div className="cuota-sub">Pendiente de pago</div>
                            }
                          </div>
                          {pago
                            ? <>
                                <span className="cuota-paid-tag">✓ Pagada</span>
                                <button className="btn-outline btn-sm" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => deshacerPago(idx, n)}>Deshacer</button>
                              </>
                            : <button className="btn-primary btn-sm" onClick={() => { setPagoForm({ fecha: '2026-06-09', metodo: 'Transferencia', ref: '' }); setShowPagoModal({ polizaIdx: idx, cuotaNum: n }) }}>+ Registrar pago</button>
                          }
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline btn-sm">📄 Ver póliza PDF</button>
                  <button className="btn-outline btn-sm">⬆ Subir documento</button>
                </div>
                <div className="upload-zone">📎 Subir PDF / JPG de esta póliza</div>
              </div>
            )}
          </div>
        )
      })}

      {/* Modal nueva póliza */}
      {showPolizaModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPolizaModal(false) }}>
          <div className="pago-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>📄 Nueva póliza</h3>
              <button onClick={() => setShowPolizaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>Cliente: {nombre}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup">
                <label>Ramo *</label>
                <select value={polizaForm.ramo} onChange={e => setPolizaForm({ ...polizaForm, ramo: e.target.value })}>
                  {RAMOS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label>N° Póliza *</label>
                <input value={polizaForm.poliza} onChange={e => setPolizaForm({ ...polizaForm, poliza: e.target.value })} placeholder="Ej: 4309338 o B423600" />
              </div>
              <div className="fgroup">
                <label>Compañía</label>
                <select value={polizaForm.compania} onChange={e => setPolizaForm({ ...polizaForm, compania: e.target.value })}>
                  {COMPANIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="fgroup">
                <label>Corredor</label>
                <select value={polizaForm.corredor} onChange={e => setPolizaForm({ ...polizaForm, corredor: e.target.value })}>
                  <option value="Fascioli">Fascioli</option>
                  <option value="ELLOS">ELLOS (externo)</option>
                </select>
              </div>
              <div className="fgroup">
                <label>Vencimiento</label>
                <input type="date" value={polizaForm.vencimiento} onChange={e => setPolizaForm({ ...polizaForm, vencimiento: e.target.value })} />
              </div>
              <div className="fgroup">
                <label>Moneda</label>
                <select value={polizaForm.moneda} onChange={e => setPolizaForm({ ...polizaForm, moneda: e.target.value })}>
                  <option value="U$S">U$S (dólares)</option>
                  <option value="$">$ (pesos)</option>
                </select>
              </div>
              <div className="fgroup">
                <label>Cantidad de cuotas</label>
                <input type="number" min="1" max="36" value={polizaForm.cuotas} onChange={e => setPolizaForm({ ...polizaForm, cuotas: e.target.value })} placeholder="Ej: 10" />
              </div>
              <div className="fgroup">
                <label>Cuota y mes</label>
                <input value={polizaForm.cuota_mes} onChange={e => setPolizaForm({ ...polizaForm, cuota_mes: e.target.value })} placeholder="Ej: 1/6 - 2/7 -" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPolizaModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarPoliza}>Guardar póliza</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      {showPagoModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowPagoModal(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>💳 Registrar pago</h3>
              <button onClick={() => setShowPagoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {nombre} · {polizas[showPagoModal.polizaIdx]?.ramo} · Cuota {showPagoModal.cuotaNum}
            </div>
            <div className="fgroup"><label>Fecha de pago</label><input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} /></div>
            <div className="fgroup">
              <label>Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                {METODOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup"><label>Referencia / Comprobante</label><input value={pagoForm.ref} onChange={e => setPagoForm({ ...pagoForm, ref: e.target.value })} placeholder="Nro. de comprobante (opcional)" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowPagoModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarPago}>✓ Confirmar pago</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
