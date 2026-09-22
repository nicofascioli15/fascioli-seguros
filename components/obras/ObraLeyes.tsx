'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, CheckCircle2, Circle, AlertTriangle, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import DatePicker from '@/components/DatePicker'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Barra, colorLeyes } from '@/components/obras/ui'
import { parseMonto } from '@/components/obras/ObraForm'
import { formatMonto, formatFecha, formatPeriodo, hoyLocal, ALERTA_TOPE_LEYES, type LeyObra } from '@/lib/obrasConfig'
import { soloColumnasLey, type ObraCompleta } from '@/lib/obrasData'

type LeyForm = { mes: string; monto: string; pagado: boolean; fecha_pago: string; comprobante: string; nota: string }

function mesActual() { return hoyLocal().slice(0, 7) }

export default function ObraLeyes({ obra, onChange }: { obra: ObraCompleta; onChange: () => void }) {
  const supabase = createClient()
  const { rl } = obra
  const [editando, setEditando] = useState<LeyObra | 'nueva' | null>(null)
  const [form, setForm] = useState<LeyForm>({ mes: mesActual(), monto: '', pagado: false, fecha_pago: '', comprobante: '', nota: '' })
  const [saving, setSaving] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<LeyObra | null>(null)
  const [editTope, setEditTope] = useState(false)
  const [tope, setTope] = useState(obra.tope_leyes != null ? String(obra.tope_leyes) : '')

  function abrirNueva() {
    // Sugiere el mes siguiente al último cargado
    const ultimo = rl.detalle[rl.detalle.length - 1]?.periodo
    let mes = mesActual()
    if (ultimo) { const [y, m] = ultimo.split('-').map(Number); const d = new Date(y, m, 1); mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
    setForm({ mes, monto: '', pagado: false, fecha_pago: '', comprobante: '', nota: '' })
    setEditando('nueva')
  }
  function abrirEditar(l: LeyObra) {
    setForm({ mes: l.periodo.slice(0, 7), monto: String(l.monto), pagado: l.pagado, fecha_pago: l.fecha_pago || '', comprobante: l.comprobante || '', nota: l.nota || '' })
    setEditando(l)
  }

  async function guardar() {
    const monto = parseMonto(form.monto)
    if (!form.mes || monto == null) { showToast('Completá el mes y el monto', 'error'); return }
    setSaving(true)
    const payload = {
      periodo: `${form.mes}-01`, monto, pagado: form.pagado,
      fecha_pago: form.pagado ? (form.fecha_pago || hoyLocal()) : null,
      comprobante: form.comprobante.trim() || null, nota: form.nota.trim() || null,
    }
    if (editando === 'nueva') {
      const { data, error } = await supabase.from('obras_leyes').insert([{ ...payload, obra_id: obra.id }]).select().single()
      if (error) { setSaving(false); showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'obras_leyes', registroId: data?.id, descripcion: `Leyes sociales ${formatPeriodo(payload.periodo)}: ${formatMonto(monto)} — ${obra.titulo} (${obra.edificio})`, datosDespues: data })
    } else if (editando) {
      const { error } = await supabase.from('obras_leyes').update(payload).eq('id', editando.id)
      if (error) { setSaving(false); showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'obras_leyes', registroId: editando.id, descripcion: `Leyes sociales editadas ${formatPeriodo(payload.periodo)} — ${obra.titulo} (${obra.edificio})`, datosAntes: soloColumnasLey(editando), datosDespues: payload })
    }
    setSaving(false)
    setEditando(null)
    onChange()
  }

  async function togglePagado(l: LeyObra) {
    const cambios = l.pagado ? { pagado: false, fecha_pago: null } : { pagado: true, fecha_pago: hoyLocal() }
    const { error } = await supabase.from('obras_leyes').update(cambios).eq('id', l.id)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'obras_leyes', registroId: l.id, descripcion: `Leyes ${formatPeriodo(l.periodo)} ${l.pagado ? 'desmarcadas' : 'marcadas'} como pagas — ${obra.titulo} (${obra.edificio})`, datosAntes: { pagado: l.pagado, fecha_pago: l.fecha_pago }, datosDespues: cambios })
    onChange()
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setSaving(true)
    const { error } = await supabase.from('obras_leyes').delete().eq('id', confirmEliminar.id)
    if (error) { setSaving(false); showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'obras_leyes', registroId: confirmEliminar.id, descripcion: `Leyes sociales eliminadas ${formatPeriodo(confirmEliminar.periodo)} — ${obra.titulo} (${obra.edificio})`, datosAntes: soloColumnasLey(confirmEliminar) })
    setSaving(false)
    setConfirmEliminar(null)
    onChange()
  }

  async function guardarTope() {
    const leido = parseMonto(tope)
    const nuevo = leido != null && leido > 0 ? leido : null   // tope 0 o vacío = sin tope
    const { error } = await supabase.from('obras').update({ tope_leyes: nuevo }).eq('id', obra.id)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'obras', registroId: obra.id, descripcion: `Tope de leyes sociales ${nuevo != null ? formatMonto(nuevo) : 'quitado'} — ${obra.titulo} (${obra.edificio})`, datosAntes: { tope_leyes: obra.tope_leyes }, datosDespues: { tope_leyes: nuevo } })
    setEditTope(false)
    onChange()
  }

  const color = colorLeyes(rl.alerta)

  return (
    <div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Facturado en leyes sociales</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{formatMonto(rl.totalFacturado)}
              {rl.tope != null && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}> de {formatMonto(rl.tope)} de tope</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {editTope ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input inputMode="decimal" value={tope} onChange={e => setTope(e.target.value)} placeholder="Tope en $" style={{ width: 130, padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                <button className="btn-primary btn-sm" onClick={guardarTope}>OK</button>
                <button className="btn-outline btn-sm" onClick={() => setEditTope(false)}><X size={12} /></button>
              </div>
            ) : (
              <button className="btn-outline btn-sm" onClick={() => { setTope(obra.tope_leyes != null ? String(obra.tope_leyes) : ''); setEditTope(true) }}>
                <Pencil size={12} /> {rl.tope != null ? 'Cambiar tope' : 'Definir tope'}
              </button>
            )}
          </div>
        </div>
        {rl.tope != null ? (
          <>
            <Barra pct={Math.min(1, rl.pctTope || 0)} alto={10} color={color} marcaTope />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
              <Dato label="A cargo del edificio" valor={formatMonto(rl.totalACargoEdificio)} />
              <Dato label={rl.disponible! >= 0 ? 'Disponible hasta el tope' : 'Pasado del tope'} valor={formatMonto(Math.abs(rl.disponible!))} color={rl.disponible! < 0 ? 'var(--danger)' : undefined} />
              <Dato label="Excedente (lo absorbe la empresa)" valor={formatMonto(rl.excedente)} color={rl.excedente > 0 ? 'var(--danger)' : undefined} />
              <Dato label="Pendiente de pago" valor={formatMonto(rl.pendientePago)} />
            </div>
            {rl.alerta === 'excedido' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: '10px 12px', borderRadius: 9, background: '#FEE2E2', color: '#991B1B', fontSize: 12.5, lineHeight: 1.45 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Las leyes sociales pasaron el tope del contrato por <strong>{formatMonto(rl.excedente)}</strong>. Según contrato, el edificio paga como máximo {formatMonto(rl.tope)}: el excedente hay que descontarlo de los próximos pagos a la empresa o reclamárselo.</span>
              </div>
            )}
            {rl.alerta === 'cerca' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: '10px 12px', borderRadius: 9, background: '#FEF3C7', color: '#92400E', fontSize: 12.5 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Ya se usó el {Math.round((rl.pctTope || 0) * 100)}% del tope (aviso a partir del {Math.round(ALERTA_TOPE_LEYES * 100)}%). Quedan {formatMonto(rl.disponible)}.</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--text-muted)' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} /> Sin tope definido: todo lo facturado queda a cargo del edificio. Si el contrato fija un máximo de leyes sociales, cargalo con "Definir tope".
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn-primary btn-sm" onClick={abrirNueva}><Plus size={13} /> Cargar leyes de un mes</button>
      </div>

      {rl.detalle.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 12, fontSize: 13 }}>
          Todavía no se cargaron leyes sociales. Cargá cada factura (BPS o de la empresa) por mes y el sistema va controlando el tope.
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Período</th><th>Facturado</th><th>Acumulado</th><th>A cargo edificio</th><th>Excedente</th><th>Pago</th><th /></tr></thead>
            <tbody>
              {rl.detalle.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{formatPeriodo(l.periodo)}{l.nota && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{l.nota}</div>}</td>
                  <td>{formatMonto(l.monto)}</td>
                  <td style={{ color: rl.tope != null && l.acumulado > rl.tope ? 'var(--danger)' : undefined }}>{formatMonto(l.acumulado)}</td>
                  <td>{formatMonto(l.aCargoEdificio)}</td>
                  <td style={{ color: l.excedente > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: l.excedente > 0 ? 700 : 400 }}>{l.excedente > 0 ? formatMonto(l.excedente) : '—'}</td>
                  <td>
                    <button onClick={() => togglePagado(l)} title={l.pagado ? 'Desmarcar' : 'Marcar como pagado hoy'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: l.pagado ? '#2E9668' : 'var(--text-muted)', fontSize: 12, padding: 0 }}>
                      {l.pagado ? <CheckCircle2 size={16} /> : <Circle size={16} />} {l.pagado ? formatFecha(l.fecha_pago) : 'Pendiente'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-outline btn-sm" onClick={() => abrirEditar(l)}><Pencil size={12} /></button>{' '}
                    <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(l)}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mobile-list" style={{ display: 'none' }}>
            {rl.detalle.map(l => (
              <div key={l.id} onClick={() => abrirEditar(l)} style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5FB', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{formatPeriodo(l.periodo)}</strong><strong>{formatMonto(l.monto)}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Acumulado {formatMonto(l.acumulado)}{l.excedente > 0 ? <span style={{ color: 'var(--danger)' }}> · excedente {formatMonto(l.excedente)}</span> : ''} · {l.pagado ? `pagado ${formatFecha(l.fecha_pago)}` : 'pendiente'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>{editando === 'nueva' ? 'Cargar leyes sociales' : 'Editar leyes sociales'}</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
              <div className="fgroup"><label>Mes</label>
                <input type="month" value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} /></div>
              <div className="fgroup"><label>Monto ($)</label>
                <input inputMode="decimal" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="Siempre en pesos" /></div>
              <div className="fgroup"><label>Comprobante / factura</label>
                <input value={form.comprobante} onChange={e => setForm(f => ({ ...f, comprobante: e.target.value }))} placeholder="Opcional" /></div>
              <div className="fgroup"><label>Nota</label>
                <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Opcional" /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={form.pagado} onChange={e => setForm(f => ({ ...f, pagado: e.target.checked, fecha_pago: e.target.checked ? (f.fecha_pago || hoyLocal()) : '' }))} style={{ width: 'auto' }} /> Ya está pagado
                </label>
              </div>
              {form.pagado && <div className="fgroup"><label>Fecha de pago</label><DatePicker value={form.fecha_pago} onChange={v => setForm(f => ({ ...f, fecha_pago: v }))} /></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar estas leyes sociales?"
        message={<>Se va a eliminar el registro de <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar ? formatPeriodo(confirmEliminar.periodo) : ''}</strong>.</>}
        loading={saving}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}

function Dato({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card-alt)', borderRadius: 9, padding: '9px 11px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: color || 'var(--text-main)', marginTop: 2 }}>{valor}</div>
    </div>
  )
}
