'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, AlertTriangle, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import DatePicker from '@/components/DatePicker'
import ConfirmDialog from '@/components/ConfirmDialog'
import { parseMonto } from '@/components/obras/ObraForm'
import { formatMonto, formatFecha, formatPeriodo, hoyLocal, redondear, ALERTA_TOPE_LEYES, type LeyObra } from '@/lib/obrasConfig'
import { soloColumnasLey, type ObraCompleta } from '@/lib/obrasData'

type LeyForm = { mes: string; monto: string; nota: string }

function mesActual() { return hoyLocal().slice(0, 7) }

// Leyes sociales (BPS): se manejan igual que las cuotas (lista numerada, "+ Registrar pago",
// "Pagada" / "Deshacer"), pero aparte, y con una barra que se va llenando pago a pago contra el
// tope del contrato. Siempre en pesos.
export default function ObraLeyes({ obra, onChange }: { obra: ObraCompleta; onChange: () => void }) {
  const supabase = createClient()
  const hoy = hoyLocal()
  const { rl } = obra

  const [metodos, setMetodos] = useState<string[]>([])
  const [editando, setEditando] = useState<LeyObra | 'nueva' | null>(null)
  const [form, setForm] = useState<LeyForm>({ mes: mesActual(), monto: '', nota: '' })
  const [saving, setSaving] = useState(false)
  const [pagando, setPagando] = useState<LeyObra | null>(null)
  const [pagoForm, setPagoForm] = useState({ fecha: hoy, metodo: '', referencia: '' })
  const [confirmDeshacer, setConfirmDeshacer] = useState<LeyObra | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<LeyObra | null>(null)
  const [editTope, setEditTope] = useState(false)
  const [tope, setTope] = useState(obra.tope_leyes != null ? String(obra.tope_leyes) : '')

  useEffect(() => {
    supabase.from('metodos_pago').select('nombre').order('nombre').then(({ data }) => {
      if (data) setMetodos(data.map((x: any) => x.nombre))
    })
  }, [])

  function abrirNueva() {
    // Sugiere el mes siguiente al último cargado
    const ultimo = rl.detalle[rl.detalle.length - 1]?.periodo
    let mes = mesActual()
    if (ultimo) { const [y, m] = ultimo.split('-').map(Number); const d = new Date(y, m, 1); mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
    setForm({ mes, monto: '', nota: '' })
    setEditando('nueva')
  }
  function abrirEditar(l: LeyObra) {
    setForm({ mes: l.periodo.slice(0, 7), monto: String(l.monto), nota: l.nota || '' })
    setEditando(l)
  }
  function abrirPago(l: LeyObra) {
    setPagoForm({ fecha: hoy, metodo: metodos[0] || 'Transferencia', referencia: l.comprobante || '' })
    setPagando(l)
  }

  // Cómo queda contra el tope si se guarda lo que está en el formulario (para avisar antes de cargar)
  const montoForm = parseMonto(form.monto) || 0
  const acumuladoOtros = rl.detalle.filter(d => editando === 'nueva' || !editando || d.id !== editando.id).reduce((s, d) => s + d.monto, 0)
  const acumuladoConEste = redondear(acumuladoOtros + montoForm)
  const excedeCon = rl.tope != null ? Math.max(0, redondear(acumuladoConEste - rl.tope)) : 0

  async function guardar() {
    const monto = parseMonto(form.monto)
    if (!form.mes || monto == null || monto <= 0) { showToast('Completá el mes y el monto', 'error'); return }
    setSaving(true)
    const payload = { periodo: `${form.mes}-01`, monto, nota: form.nota.trim() || null }
    if (editando === 'nueva') {
      const { data, error } = await supabase.from('obras_leyes').insert([{ ...payload, obra_id: obra.id, pagado: false }]).select().single()
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

  async function registrarPago() {
    if (!pagando) return
    setSaving(true)
    const cambios = { pagado: true, fecha_pago: pagoForm.fecha || hoy, metodo: pagoForm.metodo || null, comprobante: pagoForm.referencia.trim() || null }
    const { error } = await supabase.from('obras_leyes').update(cambios).eq('id', pagando.id)
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'obras_leyes', registroId: pagando.id, descripcion: `Leyes ${formatPeriodo(pagando.periodo)} pagadas (${formatMonto(pagando.monto)}) — ${obra.titulo} (${obra.edificio})`, datosAntes: { pagado: false, fecha_pago: null, metodo: pagando.metodo ?? null, comprobante: pagando.comprobante }, datosDespues: cambios })
    showToast('Pago de leyes registrado', 'success')
    setPagando(null)
    onChange()
  }

  async function deshacerPago() {
    const l = confirmDeshacer
    if (!l) return
    setSaving(true)
    const cambios = { pagado: false, fecha_pago: null, metodo: null, comprobante: null }
    const { error } = await supabase.from('obras_leyes').update(cambios).eq('id', l.id)
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'obras_leyes', registroId: l.id, descripcion: `Pago de leyes ${formatPeriodo(l.periodo)} deshecho — ${obra.titulo} (${obra.edificio})`, datosAntes: { pagado: true, fecha_pago: l.fecha_pago, metodo: l.metodo ?? null, comprobante: l.comprobante }, datosDespues: cambios })
    setConfirmDeshacer(null)
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

  // ── Barra "que se llena sumando cada pago" ────────────────────────────────
  // La escala es el tope (o lo facturado si se pasó / no hay tope). Cada pago de BPS es un tramo:
  // verde = pagado, dorado = facturado pendiente de pago, rojo = lo que pasa del tope.
  const escala = Math.max(rl.tope ?? 0, rl.totalFacturado, 1)
  const tramos: { pct: number; color: string; opacidad: number; titulo: string }[] = []
  rl.detalle.forEach(d => {
    if (d.aCargoEdificio > 0) tramos.push({ pct: d.aCargoEdificio / escala * 100, color: d.pagado ? '#2E9668' : 'var(--gold)', opacidad: d.pagado ? 1 : 0.75, titulo: `${formatPeriodo(d.periodo)} · ${formatMonto(d.aCargoEdificio)} · ${d.pagado ? 'pagado' : 'pendiente'}` })
    if (d.excedente > 0) tramos.push({ pct: d.excedente / escala * 100, color: 'var(--danger)', opacidad: 1, titulo: `${formatPeriodo(d.periodo)} · excede el tope en ${formatMonto(d.excedente)}` })
  })
  const cantPagadas = rl.detalle.filter(d => d.pagado).length
  const pctTope = rl.pctTope != null ? Math.round(rl.pctTope * 100) : null

  return (
    <div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px' }}>
        {/* Encabezado + tope */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>
            Leyes sociales BPS <span style={{ fontWeight: 400 }}>({cantPagadas}/{rl.detalle.length} pagadas)</span>
          </div>
          {editTope ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input inputMode="decimal" value={tope} onChange={e => setTope(e.target.value)} placeholder="Tope en $" autoFocus
                style={{ width: 130, padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-main)' }} />
              <button className="btn-primary btn-sm" onClick={guardarTope}>OK</button>
              <button className="btn-outline btn-sm" onClick={() => setEditTope(false)}><X size={12} /></button>
            </div>
          ) : (
            <button className="btn-outline btn-sm" onClick={() => { setTope(obra.tope_leyes != null ? String(obra.tope_leyes) : ''); setEditTope(true) }}>
              <Pencil size={12} /> {rl.tope != null ? `Tope ${formatMonto(rl.tope)}` : 'Definir tope del contrato'}
            </button>
          )}
        </div>

        {/* Barra por tramos */}
        <div style={{ position: 'relative', height: 26, borderRadius: 8, background: 'var(--border-soft)', overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
          {tramos.map((t, i) => (
            <div key={i} title={t.titulo}
              style={{ width: `${t.pct}%`, height: '100%', background: t.color, opacity: t.opacidad, flexShrink: 0, borderRight: i < tramos.length - 1 ? '2px solid var(--bg-card)' : 'none', boxSizing: 'border-box', transition: 'width .4s' }} />
          ))}
          {rl.tope != null && rl.totalFacturado > rl.tope && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(rl.tope / escala) * 100}%`, width: 3, background: 'var(--navy)' }} title={`Tope ${formatMonto(rl.tope)}`} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
          <span>Sumado <strong style={{ color: 'var(--text-main)' }}>{formatMonto(rl.totalFacturado)}</strong>{rl.tope != null && <> de {formatMonto(rl.tope)} ({pctTope}%)</>}</span>
          {rl.tope != null && (
            rl.disponible! >= 0
              ? <span>Quedan <strong style={{ color: rl.alerta === 'cerca' ? '#B45309' : 'var(--text-main)' }}>{formatMonto(rl.disponible)}</strong> hasta el tope</span>
              : <span style={{ color: 'var(--danger)' }}>Pasado del tope por <strong>{formatMonto(rl.excedente)}</strong></span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, flexWrap: 'wrap' }}>
          <Ref color="#2E9668" texto="Pagado" /><Ref color="var(--gold)" texto="Facturado, falta pagar" />{rl.excedente > 0 && <Ref color="var(--danger)" texto="Por encima del tope (lo absorbe la empresa)" />}
        </div>

        {rl.alerta === 'excedido' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12, padding: '10px 12px', borderRadius: 9, background: '#FEE2E2', color: '#991B1B', fontSize: 12.5, lineHeight: 1.45 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Se pasó del tope del contrato por <strong>{formatMonto(rl.excedente)}</strong>. El edificio paga como máximo {formatMonto(rl.tope)}: el excedente hay que descontárselo a la empresa de los próximos pagos o reclamárselo.</span>
          </div>
        )}
        {rl.alerta === 'cerca' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12, padding: '10px 12px', borderRadius: 9, background: '#FEF3C7', color: '#92400E', fontSize: 12.5 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Ya se usó el {pctTope}% del tope (aviso a partir del {Math.round(ALERTA_TOPE_LEYES * 100)}%). Quedan {formatMonto(rl.disponible)}.</span>
          </div>
        )}
        {rl.tope == null && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} /> Sin tope definido: si el contrato fija un máximo de leyes sociales, cargalo arriba y la barra se va a llenar contra ese tope.
          </div>
        )}

        {/* Lista igual a las cuotas */}
        {rl.detalle.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-muted)', fontSize: 13 }}>
            Todavía no hay leyes sociales cargadas. Cargá cada factura de BPS del mes y la barra se va llenando.
          </div>
        ) : rl.detalle.map((l, i) => (
          <div key={l.id} className={`cuota-row ${l.pagado ? 'paid' : ''}`}
            style={l.excedente > 0 && !l.pagado ? { background: '#FEF2F2', borderColor: '#FECACA' } : undefined}>
            <div className={`cuota-num ${l.pagado ? 'paid' : 'pending'}`}>{i + 1}</div>
            <div className="cuota-info">
              <div className="cuota-title">Leyes {formatPeriodo(l.periodo)} · <span style={{ fontWeight: 800 }}>{formatMonto(l.monto)}</span></div>
              <div className="cuota-sub">
                {l.pagado ? `Pagado ${formatFecha(l.fecha_pago)}${l.metodo ? ` · ${l.metodo}` : ''}${l.comprobante ? ` · ${l.comprobante}` : ''}` : 'Pendiente'}
                {rl.tope != null && <> · acumulado {formatMonto(l.acumulado)}</>}
                {l.excedente > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}> · excede {formatMonto(l.excedente)}</span>}
                {l.nota && <> · {l.nota}</>}
              </div>
            </div>
            {l.pagado ? (
              <>
                <span className="cuota-paid-tag">Pagada</span>
                <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6 }} onClick={() => setConfirmDeshacer(l)}>Deshacer</button>
              </>
            ) : (
              <>
                <button className="btn-primary btn-sm" onClick={() => abrirPago(l)}>+ Registrar pago</button>
                <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6 }} title="Editar" onClick={() => abrirEditar(l)}><Pencil size={12} /></button>
                <button className="btn-outline btn-sm" style={{ fontSize: 11, marginLeft: 6, color: 'var(--danger)', borderColor: '#FEE2E2' }} title="Eliminar" onClick={() => setConfirmEliminar(l)}><Trash2 size={12} /></button>
              </>
            )}
          </div>
        ))}

        <div style={{ marginTop: 14 }}>
          <button className="btn-primary btn-sm" onClick={abrirNueva}><Plus size={13} /> Cargar factura BPS del mes</button>
        </div>
      </div>

      {/* Modal cargar / editar factura del mes */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>{editando === 'nueva' ? 'Cargar leyes sociales' : 'Editar leyes sociales'}</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{obra.edificio} · {obra.titulo}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
              <div className="fgroup"><label>Mes</label>
                <input type="month" value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} /></div>
              <div className="fgroup"><label>Monto ($)</label>
                <input inputMode="decimal" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="Siempre en pesos" autoFocus /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nota</label>
                <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Opcional" /></div>
            </div>
            {rl.tope != null && montoForm > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 9, fontSize: 12.5, lineHeight: 1.45,
                background: excedeCon > 0 ? '#FEE2E2' : acumuladoConEste >= rl.tope * ALERTA_TOPE_LEYES ? '#FEF3C7' : 'var(--bg-card-alt)',
                color: excedeCon > 0 ? '#991B1B' : acumuladoConEste >= rl.tope * ALERTA_TOPE_LEYES ? '#92400E' : 'var(--text-muted)' }}>
                {excedeCon > 0
                  ? <>Con este monto se pasa del tope por <strong>{formatMonto(excedeCon)}</strong> ({formatMonto(acumuladoConEste)} de {formatMonto(rl.tope)}). Ese excedente lo absorbe la empresa.</>
                  : <>Con este monto quedan sumados {formatMonto(acumuladoConEste)} de {formatMonto(rl.tope)} ({Math.round(acumuladoConEste / rl.tope * 100)}%). Quedan {formatMonto(redondear(rl.tope - acumuladoConEste))}.</>}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago — igual al de las cuotas */}
      {pagando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !saving) setPagando(null) }}>
          <div className="pago-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Registrar pago de leyes</h3>
              <button onClick={() => setPagando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              {obra.edificio} · {obra.titulo} · Leyes {formatPeriodo(pagando.periodo)} · <strong style={{ color: 'var(--text-main)' }}>{formatMonto(pagando.monto)}</strong>
            </div>
            <div className="fgroup">
              <label>Fecha de pago</label>
              <DatePicker value={pagoForm.fecha} onChange={v => setPagoForm(f => ({ ...f, fecha: v }))} />
            </div>
            <div className="fgroup">
              <label>Método de pago</label>
              <select value={pagoForm.metodo} onChange={e => setPagoForm(f => ({ ...f, metodo: e.target.value }))}>
                {(metodos.length ? metodos : ['Transferencia']).map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="fgroup">
              <label>Referencia</label>
              <input value={pagoForm.referencia} onChange={e => setPagoForm(f => ({ ...f, referencia: e.target.value }))} placeholder="N° de factura BPS / comprobante (opcional)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setPagando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarPago} disabled={saving}>
                {saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeshacer}
        title="¿Deshacer este pago?"
        message={<>El pago de las leyes de <strong style={{ color: 'var(--text-main)' }}>{confirmDeshacer ? formatPeriodo(confirmDeshacer.periodo) : ''}</strong> vuelve a quedar pendiente.</>}
        confirmLabel="Deshacer pago"
        loading={saving}
        onConfirm={deshacerPago}
        onCancel={() => setConfirmDeshacer(null)}
      />

      <ConfirmDialog
        open={!!confirmEliminar}
        title="¿Eliminar estas leyes sociales?"
        message={<>Se va a eliminar la factura de <strong style={{ color: 'var(--text-main)' }}>{confirmEliminar ? formatPeriodo(confirmEliminar.periodo) : ''}</strong> y deja de sumar en la barra.</>}
        loading={saving}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}

function Ref({ color, texto }: { color: string; texto: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />{texto}</span>
}
