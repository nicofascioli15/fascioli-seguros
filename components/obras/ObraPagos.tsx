'use client'
import { useState } from 'react'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Wand2, X, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import DatePicker from '@/components/DatePicker'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Barra } from '@/components/obras/ui'
import { parseMonto } from '@/components/obras/ObraForm'
import {
  formatMonto, formatFecha, hoyLocal, generarPlan, PRESETS_PLAN, TIPOS_PAGO, addMesesObra, redondear,
  type PagoObra, type ParamsPlan, type TipoPago,
} from '@/lib/obrasConfig'
import type { ObraCompleta as ObraCompletaLike } from '@/lib/obrasData'

type PagoForm = { concepto: string; tipo: TipoPago; monto: string; fecha_prevista: string; condicion: string; pagado: boolean; fecha_pago: string; comprobante: string }
const vacio: PagoForm = { concepto: '', tipo: 'cuota', monto: '', fecha_prevista: '', condicion: '', pagado: false, fecha_pago: '', comprobante: '' }

export default function ObraPagos({ obra, onChange }: { obra: ObraCompletaLike; onChange: () => void }) {
  const supabase = createClient()
  const hoy = hoyLocal()
  const { rp, pagos, moneda } = obra

  const [editando, setEditando] = useState<PagoObra | 'nuevo' | null>(null)
  const [form, setForm] = useState<PagoForm>(vacio)
  const [saving, setSaving] = useState(false)
  const [pagando, setPagando] = useState<PagoObra | null>(null)
  const [pagoFecha, setPagoFecha] = useState(hoy)
  const [pagoComprobante, setPagoComprobante] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState<PagoObra | null>(null)
  const [showPlan, setShowPlan] = useState(false)

  function abrirNuevo() {
    setForm({ ...vacio, concepto: `Cuota ${pagos.filter(p => p.tipo === 'cuota').length + 1}` })
    setEditando('nuevo')
  }
  function abrirEditar(p: PagoObra) {
    setForm({ concepto: p.concepto, tipo: p.tipo, monto: String(p.monto), fecha_prevista: p.fecha_prevista || '', condicion: p.condicion || '', pagado: p.pagado, fecha_pago: p.fecha_pago || '', comprobante: p.comprobante || '' })
    setEditando(p)
  }

  async function guardar() {
    const monto = parseMonto(form.monto)
    if (!form.concepto.trim() || monto == null) { showToast('Completá concepto y monto', 'error'); return }
    setSaving(true)
    const payload = {
      concepto: form.concepto.trim(), tipo: form.tipo, monto,
      porcentaje: obra.precio_total ? redondear(monto / obra.precio_total * 100) : null,
      fecha_prevista: form.fecha_prevista || null, condicion: form.condicion.trim() || null,
      pagado: form.pagado, fecha_pago: form.pagado ? (form.fecha_pago || hoy) : null, comprobante: form.comprobante.trim() || null,
    }
    if (editando === 'nuevo') {
      const orden = (pagos.reduce((m, p) => Math.max(m, p.orden), 0) || 0) + 1
      const { data, error } = await supabase.from('obras_pagos').insert([{ ...payload, obra_id: obra.id, orden }]).select().single()
      if (error) { setSaving(false); showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'obras_pagos', registroId: data?.id, descripcion: `Pago agregado al plan: ${payload.concepto} — ${obra.titulo} (${obra.edificio})`, datosDespues: data })
    } else if (editando) {
      const { error } = await supabase.from('obras_pagos').update(payload).eq('id', editando.id)
      if (error) { setSaving(false); showToast(error.message, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'obras_pagos', registroId: editando.id, descripcion: `Pago editado: ${payload.concepto} — ${obra.titulo} (${obra.edificio})`, datosAntes: editando, datosDespues: payload })
    }
    setSaving(false)
    setEditando(null)
    onChange()
  }

  async function confirmarPago() {
    if (!pagando) return
    setSaving(true)
    const cambios = { pagado: true, fecha_pago: pagoFecha || hoy, comprobante: pagoComprobante.trim() || pagando.comprobante }
    const { error } = await supabase.from('obras_pagos').update(cambios).eq('id', pagando.id)
    if (!error) {
      await registrarAudit({ accion: 'editar', tabla: 'obras_pagos', registroId: pagando.id, descripcion: `Pago registrado: ${pagando.concepto} (${formatMonto(pagando.monto, moneda)}) — ${obra.titulo} (${obra.edificio})`, datosAntes: { pagado: false, fecha_pago: null, comprobante: pagando.comprobante }, datosDespues: cambios })
      showToast('Pago registrado', 'success')
    } else showToast(error.message, 'error')
    setSaving(false)
    setPagando(null)
    onChange()
  }

  async function deshacerPago(p: PagoObra) {
    const { error } = await supabase.from('obras_pagos').update({ pagado: false, fecha_pago: null }).eq('id', p.id)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'obras_pagos', registroId: p.id, descripcion: `Pago desmarcado: ${p.concepto} — ${obra.titulo} (${obra.edificio})`, datosAntes: { pagado: true, fecha_pago: p.fecha_pago }, datosDespues: { pagado: false, fecha_pago: null } })
    onChange()
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setSaving(true)
    const { error } = await supabase.from('obras_pagos').delete().eq('id', confirmEliminar.id)
    if (error) { setSaving(false); showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'obras_pagos', registroId: confirmEliminar.id, descripcion: `Pago eliminado del plan: ${confirmEliminar.concepto} — ${obra.titulo} (${obra.edificio})`, datosAntes: confirmEliminar })
    setSaving(false)
    setConfirmEliminar(null)
    onChange()
  }

  const ordenados = [...pagos].sort((a, b) => a.orden - b.orden)

  return (
    <div>
      {/* Resumen */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pagado</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{formatMonto(rp.totalPagado, moneda)} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>de {formatMonto(obra.precio_total ?? rp.totalPlan, moneda)}</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saldo</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: rp.saldo > 0 ? 'var(--text-main)' : '#2E9668' }}>{formatMonto(rp.saldo, moneda)}</div>
          </div>
        </div>
        <Barra pct={rp.pctPagado} alto={8} color={rp.vencidos.length > 0 ? 'var(--danger)' : 'var(--gold)'} />
        {obra.precio_total != null && pagos.length > 0 && Math.abs(rp.diferenciaPlan) >= 0.01 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#B45309', marginTop: 10 }}>
            <AlertTriangle size={13} /> El plan suma {formatMonto(rp.totalPlan, moneda)}: {rp.diferenciaPlan > 0 ? `faltan ${formatMonto(rp.diferenciaPlan, moneda)}` : `sobran ${formatMonto(-rp.diferenciaPlan, moneda)}`} para llegar al precio del contrato.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn-primary btn-sm" onClick={() => setShowPlan(true)}><Wand2 size={13} /> {pagos.length === 0 ? 'Armar plan de pagos' : 'Rearmar plan'}</button>
        <button className="btn-outline btn-sm" onClick={abrirNuevo}><Plus size={13} /> Agregar pago</button>
      </div>

      {ordenados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 12, fontSize: 13 }}>
          Todavía no hay plan de pagos. Usá "Armar plan de pagos" para generarlo en un paso (entrega inicial, avance, cuotas, final).
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ordenados.map(p => {
            const atrasado = !p.pagado && !!p.fecha_prevista && p.fecha_prevista < hoy
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--bg-card)', border: `1px solid ${atrasado ? '#FCA5A5' : 'var(--border-soft)'}`, borderRadius: 10, flexWrap: 'wrap' }}>
                <button title={p.pagado ? 'Desmarcar pago' : 'Registrar pago'} onClick={() => p.pagado ? deshacerPago(p) : (setPagando(p), setPagoFecha(hoy), setPagoComprobante(p.comprobante || ''))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: p.pagado ? '#2E9668' : atrasado ? 'var(--danger)' : 'var(--text-muted)', display: 'flex' }}>
                  {p.pagado ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.concepto}{p.porcentaje ? <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}> · {Number(p.porcentaje).toLocaleString('es-UY', { maximumFractionDigits: 2 })}%</span> : null}</div>
                  <div style={{ fontSize: 12, color: atrasado ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {p.pagado
                      ? `Pagado el ${formatFecha(p.fecha_pago)}${p.comprobante ? ` · ${p.comprobante}` : ''}`
                      : p.fecha_prevista ? `${atrasado ? 'Atrasado — vencía' : 'Vence'} el ${formatFecha(p.fecha_prevista)}` : (p.condicion || 'Sin fecha')}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }}>{formatMonto(p.monto, moneda)}</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn-outline btn-sm" title="Editar" onClick={() => abrirEditar(p)}><Pencil size={12} /></button>
                  <button className="btn-outline btn-sm" title="Eliminar" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(p)}><Trash2 size={12} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal agregar / editar pago */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>{editando === 'nuevo' ? 'Agregar pago' : 'Editar pago'}</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Concepto</label>
                <input value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} /></div>
              <div className="fgroup"><label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoPago }))}>
                  {TIPOS_PAGO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></div>
              <div className="fgroup"><label>Monto ({moneda === 'USD' ? 'U$S' : '$'})</label>
                <input inputMode="decimal" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></div>
              <div className="fgroup"><label>Fecha prevista</label>
                <DatePicker value={form.fecha_prevista} onChange={v => setForm(f => ({ ...f, fecha_prevista: v }))} placeholder="Si tiene fecha fija" /></div>
              <div className="fgroup"><label>Condición</label>
                <input value={form.condicion} onChange={e => setForm(f => ({ ...f, condicion: e.target.value }))} placeholder="Ej: al 50% de avance" /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={form.pagado} onChange={e => setForm(f => ({ ...f, pagado: e.target.checked, fecha_pago: e.target.checked ? (f.fecha_pago || hoy) : '' }))} style={{ width: 'auto' }} /> Ya está pagado
                </label>
              </div>
              {form.pagado && (
                <>
                  <div className="fgroup"><label>Fecha de pago</label>
                    <DatePicker value={form.fecha_pago} onChange={v => setForm(f => ({ ...f, fecha_pago: v }))} /></div>
                  <div className="fgroup"><label>Comprobante / factura</label>
                    <input value={form.comprobante} onChange={e => setForm(f => ({ ...f, comprobante: e.target.value }))} placeholder="Opcional" /></div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      <ConfirmDialog
        open={!!pagando}
        tone="neutral"
        icon={<CheckCircle2 size={26} color="#2E9668" />}
        title={`Registrar pago: ${pagando?.concepto || ''}`}
        confirmLabel="Registrar pago"
        loading={saving}
        loadingLabel="Guardando..."
        message={
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            <div style={{ fontSize: 14 }}>Monto: <strong style={{ color: 'var(--text-main)' }}>{pagando ? formatMonto(pagando.monto, moneda) : ''}</strong></div>
            <div className="fgroup" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>Fecha de pago</label><DatePicker value={pagoFecha} onChange={setPagoFecha} /></div>
            <div className="fgroup" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>Comprobante / factura (opcional)</label><input value={pagoComprobante} onChange={e => setPagoComprobante(e.target.value)} /></div>
          </div>
        }
        onConfirm={confirmarPago}
        onCancel={() => setPagando(null)}
      />

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar este pago del plan?"
        message={<>Se va a eliminar <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar?.concepto}</strong> ({confirmEliminar ? formatMonto(confirmEliminar.monto, moneda) : ''}).</>}
        loading={saving}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />

      {showPlan && <PlanWizard obra={obra} onClose={() => setShowPlan(false)} onDone={() => { setShowPlan(false); onChange() }} />}
    </div>
  )
}

// ── Asistente para armar el plan de pagos ─────────────────────────────────
function PlanWizard({ obra, onClose, onDone }: { obra: ObraCompletaLike; onClose: () => void; onDone: () => void }) {
  const supabase = createClient()
  const hoy = hoyLocal()
  const fechaBase = obra.fecha_contrato || hoy
  const [precio, setPrecio] = useState(obra.precio_total != null ? String(obra.precio_total) : '')
  const pagados = obra.pagos.filter(x => x.pagado)
  const yaHuboInicial = pagados.some(x => x.tipo === 'entrega_inicial')
  const [p, setP] = useState<Omit<ParamsPlan, 'precio'>>({
    inicialPct: yaHuboInicial ? 0 : 30, avancePct: 0, avanceCondicion: 'Al 50% de avance de obra', finalPct: 0, cuotas: 10,
    fechaInicial: fechaBase, fechaPrimeraCuota: addMesesObra(yaHuboInicial ? hoy : fechaBase, 1),
  })
  const [saving, setSaving] = useState(false)
  const precioNum = parseMonto(precio) || 0
  // Si ya hay pagos hechos, el plan nuevo se arma sobre lo que falta pagar.
  const yaPagado = pagados.reduce((s, x) => s + x.monto, 0)
  const aPlanificar = Math.max(0, redondear(precioNum - yaPagado))
  // El % que se guarda en cada pago es siempre sobre el precio total del contrato.
  const preview = generarPlan({ ...p, precio: aPlanificar }).map(it => ({ ...it, porcentaje: precioNum > 0 ? redondear(it.monto / precioNum * 100) : null }))
  const sumaPct = (p.inicialPct || 0) + (p.avancePct || 0) + (p.finalPct || 0)

  async function aplicar() {
    if (precioNum <= 0) { showToast('Poné el precio total de la obra', 'error'); return }
    if (sumaPct > 100) { showToast('Los porcentajes suman más de 100%', 'error'); return }
    setSaving(true)
    if (obra.precio_total == null || Math.abs((obra.precio_total || 0) - precioNum) > 0.001) {
      const { error: errPrecio } = await supabase.from('obras').update({ precio_total: precioNum }).eq('id', obra.id)
      if (errPrecio) { setSaving(false); showToast(`No se pudo actualizar el precio: ${errPrecio.message}`, 'error'); return }
      await registrarAudit({ accion: 'editar', tabla: 'obras', registroId: obra.id, descripcion: `Precio de la obra ${formatMonto(precioNum, obra.moneda)} — ${obra.titulo} (${obra.edificio})`, datosAntes: { precio_total: obra.precio_total }, datosDespues: { precio_total: precioNum } })
    }
    // Primero se inserta el plan nuevo y recién después se borran los pagos pendientes viejos:
    // si algo falla a mitad de camino, no se pierde el plan anterior.
    const impagos = obra.pagos.filter(x => !x.pagado)
    const base = (obra.pagos.reduce((m, x) => Math.max(m, x.orden), 0) || 0)
    const filas = preview.map((it, i) => ({ ...it, obra_id: obra.id, orden: base + i + 1 }))
    const { error } = await supabase.from('obras_pagos').insert(filas)
    if (error) { setSaving(false); showToast(`No se pudo guardar el plan: ${error.message}`, 'error'); return }
    if (impagos.length > 0) {
      const { error: errDel } = await supabase.from('obras_pagos').delete().in('id', impagos.map(x => x.id))
      if (errDel) showToast(`El plan nuevo se guardó, pero no se pudieron borrar los pagos pendientes viejos: ${errDel.message}`, 'error')
    }
    // Reordena para que el plan quede 1, 2, 3... detrás de los pagos ya hechos
    const { data: todos } = await supabase.from('obras_pagos').select('id, orden, pagado').eq('obra_id', obra.id).order('orden')
    await Promise.all((todos || []).map((x: any, i: number) => x.orden !== i + 1 ? supabase.from('obras_pagos').update({ orden: i + 1 }).eq('id', x.id) : null))
    setSaving(false)
    await registrarAudit({ accion: 'crear', tabla: 'obras_pagos', descripcion: `Plan de pagos armado (${filas.length} pagos${impagos.length ? `, reemplazó ${impagos.length} pendientes` : ''}) — ${obra.titulo} (${obra.edificio})`, datosAntes: impagos.length ? impagos : null, datosDespues: filas })
    showToast('Plan de pagos armado', 'success')
    onDone()
  }

  const num = (v: number, set: (n: number) => void, max = 100) => (
    <input type="number" min={0} max={max} value={v} onChange={e => set(Math.max(0, Math.min(max, parseFloat(e.target.value) || 0)))} />
  )

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="pago-modal" style={{ width: 640, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Armar plan de pagos</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
          Elegí un esquema rápido o ajustá los porcentajes. Después podés editar cada pago a mano.
          {pagados.length > 0 && <> Los <strong>{pagados.length} pagos ya hechos</strong> se mantienen; el plan nuevo reparte lo que falta ({formatMonto(aPlanificar, obra.moneda)}).</>}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESETS_PLAN.map(pr => (
            <button key={pr.id} className="filter-btn" title={pr.ayuda} onClick={() => setP(x => ({ ...x, ...pr.valores }))}>{pr.label}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 14px' }}>
          <div className="fgroup" style={{ gridColumn: 'span 3' }}><label>Precio total de la obra ({obra.moneda === 'USD' ? 'U$S' : '$'})</label>
            <input inputMode="decimal" value={precio} onChange={e => setPrecio(e.target.value)} /></div>
          <div className="fgroup"><label>Entrega inicial %</label>{num(p.inicialPct, v => setP(x => ({ ...x, inicialPct: v })))}</div>
          <div className="fgroup"><label>Por avance %</label>{num(p.avancePct, v => setP(x => ({ ...x, avancePct: v })))}</div>
          <div className="fgroup"><label>Al finalizar %</label>{num(p.finalPct, v => setP(x => ({ ...x, finalPct: v })))}</div>
          <div className="fgroup"><label>Fecha entrega inicial</label><DatePicker value={p.fechaInicial} onChange={v => setP(x => ({ ...x, fechaInicial: v }))} /></div>
          <div className="fgroup"><label>Cuotas iguales (resto)</label>{num(p.cuotas, v => setP(x => ({ ...x, cuotas: Math.round(v) })), 120)}</div>
          <div className="fgroup"><label>Primera cuota</label><DatePicker value={p.fechaPrimeraCuota} onChange={v => setP(x => ({ ...x, fechaPrimeraCuota: v }))} /></div>
          {p.avancePct > 0 && (
            <div className="fgroup" style={{ gridColumn: 'span 3' }}><label>Condición del pago por avance</label>
              <input value={p.avanceCondicion} onChange={e => setP(x => ({ ...x, avanceCondicion: e.target.value }))} /></div>
          )}
        </div>
        {sumaPct > 100 && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>Los porcentajes suman {sumaPct}%: no pueden pasar de 100%.</div>}

        <div style={{ marginTop: 16, border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card-alt)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>
            Vista previa · {preview.length} pagos · total {formatMonto(preview.reduce((s, x) => s + x.monto, 0), obra.moneda)}
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {preview.length === 0 ? <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>Cargá el precio y los porcentajes para ver el plan.</div> : preview.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderTop: i ? '1px solid var(--border-soft)' : 'none', fontSize: 13 }}>
                <span><strong>{it.concepto}</strong> <span style={{ color: 'var(--text-muted)' }}>· {it.fecha_prevista ? formatFecha(it.fecha_prevista) : it.condicion}</span></span>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMonto(it.monto, obra.moneda)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{obra.pagos.some(x => !x.pagado) ? 'Reemplaza los pagos pendientes actuales.' : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn-primary" onClick={aplicar} disabled={saving || preview.length === 0 || sumaPct > 100}>{saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : 'Guardar plan'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
