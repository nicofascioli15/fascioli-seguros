'use client'
import { useState } from 'react'
import { Plus, Loader2, X } from 'lucide-react'
import DatePicker from '@/components/DatePicker'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { TIPOS_OBRA, CIERRES_BPS, addMesesObra, formatFecha, type Obra } from '@/lib/obrasConfig'

export type ObraFormState = {
  cliente_id: string
  titulo: string
  descripcion: string
  empresa: string
  tipo_obra: Obra['tipo_obra']
  titular_bps: Obra['titular_bps']
  nro_obra_bps: string
  fecha_inscripcion_bps: string
  moneda: Obra['moneda']
  precio_total: string
  fecha_contrato: string
  fecha_inicio: string
  fecha_fin_prevista: string
  fecha_fin_real: string
  avance: number
  tope_leyes: string
  garantia_cantidad: number
  garantia_unidad: 'meses' | 'anios'
  cierre_bps_estado: Obra['cierre_bps_estado']
  cierre_bps_fecha: string
  nota: string
}

export const emptyObraForm: ObraFormState = {
  cliente_id: '', titulo: '', descripcion: '', empresa: '',
  tipo_obra: 'contrato', titular_bps: 'edificio', nro_obra_bps: '', fecha_inscripcion_bps: '',
  moneda: 'UYU', precio_total: '', fecha_contrato: '', fecha_inicio: '', fecha_fin_prevista: '', fecha_fin_real: '',
  avance: 0, tope_leyes: '', garantia_cantidad: 1, garantia_unidad: 'anios',
  cierre_bps_estado: 'Pendiente', cierre_bps_fecha: '', nota: '',
}

function garantiaAForm(o: Obra): { garantia_cantidad: number; garantia_unidad: 'meses' | 'anios' } {
  const meses = o.garantia_meses ?? 12
  const unidad = o.garantia_unidad || (meses % 12 === 0 && meses > 0 ? 'anios' : 'meses')
  return { garantia_unidad: unidad, garantia_cantidad: unidad === 'anios' ? meses / 12 : meses }
}

export function garantiaEnMeses(f: Pick<ObraFormState, 'garantia_cantidad' | 'garantia_unidad'>): number {
  const n = Math.max(0, Number(f.garantia_cantidad) || 0)
  return Math.round(f.garantia_unidad === 'anios' ? n * 12 : n)
}

export function obraToForm(o: Obra): ObraFormState {
  return {
    cliente_id: o.cliente_id, titulo: o.titulo || '', descripcion: o.descripcion || '', empresa: o.empresa || '',
    tipo_obra: o.tipo_obra, titular_bps: o.titular_bps, nro_obra_bps: o.nro_obra_bps || '', fecha_inscripcion_bps: o.fecha_inscripcion_bps || '',
    moneda: o.moneda, precio_total: o.precio_total != null ? String(o.precio_total) : '',
    fecha_contrato: o.fecha_contrato || '', fecha_inicio: o.fecha_inicio || '', fecha_fin_prevista: o.fecha_fin_prevista || '', fecha_fin_real: o.fecha_fin_real || '',
    avance: o.avance || 0, tope_leyes: o.tope_leyes != null ? String(o.tope_leyes) : '',
    ...garantiaAForm(o), cierre_bps_estado: o.cierre_bps_estado, cierre_bps_fecha: o.cierre_bps_fecha || '', nota: o.nota || '',
  }
}

// Acepta "1.234.567,50", "1234567.5" o "1,234,567.50" y devuelve número (o null si está vacío)
export function parseMonto(s: string): number | null {
  const t = (s || '').trim().replace(/\s/g, '').replace(/[$USu]/g, '')
  if (!t) return null
  let norm = t
  if (t.includes(',') && t.includes('.')) {
    norm = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  } else if (t.includes(',')) {
    norm = t.replace(',', '.')
  } else if ((t.match(/\./g) || []).length > 1 || /^\d{1,3}\.\d{3}$/.test(t)) {
    // En Uruguay el punto separa miles: "850.000" son ochocientos cincuenta mil.
    norm = t.replace(/\./g, '')
  }
  const n = Number(norm)
  return isFinite(n) ? n : null
}

export function formToPayload(f: ObraFormState) {
  const finReal = f.fecha_fin_real || null
  return {
    cliente_id: f.cliente_id,
    titulo: f.titulo.trim(),
    descripcion: f.descripcion.trim() || null,
    empresa: f.empresa.trim() || null,
    tipo_obra: f.tipo_obra,
    titular_bps: f.tipo_obra === 'menor_cuantia' ? 'empresa' : f.titular_bps,
    nro_obra_bps: f.nro_obra_bps.trim() || null,
    fecha_inscripcion_bps: f.fecha_inscripcion_bps || null,
    moneda: f.moneda,
    precio_total: parseMonto(f.precio_total),
    fecha_contrato: f.fecha_contrato || null,
    fecha_inicio: f.fecha_inicio || null,
    fecha_fin_prevista: f.fecha_fin_prevista || null,
    fecha_fin_real: finReal,
    tope_leyes: (parseMonto(f.tope_leyes) ?? 0) > 0 ? parseMonto(f.tope_leyes) : null,   // 0 o vacío = sin tope
    garantia_meses: garantiaEnMeses(f),
    garantia_unidad: f.garantia_unidad,
    cierre_bps_estado: f.cierre_bps_estado,
    cierre_bps_fecha: f.cierre_bps_fecha || null,
    nota: f.nota.trim() || null,
  }
}

const seccion: React.CSSProperties = { gridColumn: 'span 2', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--gold)', marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }
const ayuda: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }

export default function ObraForm({ form, setForm, edificios, edificioLocked, empresas, onEmpresaCreada, modo = 'editar' }: {
  modo?: 'nueva' | 'editar'   // en "nueva" solo se piden los datos del contrato; lo demás se carga después en la ficha
  form: ObraFormState
  setForm: (fn: (p: ObraFormState) => ObraFormState) => void
  edificios: { id: string; nombre: string }[]
  edificioLocked?: { id: string; nombre: string } | null
  empresas: string[]
  onEmpresaCreada?: (nombre: string) => void
}) {
  const set = (patch: Partial<ObraFormState>) => setForm(p => ({ ...p, ...patch }))
  const tipoInfo = TIPOS_OBRA.find(t => t.value === form.tipo_obra)
  const esMenorCuantia = form.tipo_obra === 'menor_cuantia'
  const esNueva = modo === 'nueva'
  const mesesGarantia = garantiaEnMeses(form)
  const garantiaHasta = form.fecha_contrato && mesesGarantia > 0 ? addMesesObra(form.fecha_contrato, mesesGarantia) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Edificio *</label>
        {edificioLocked ? (
          <div style={{ padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--navy)', background: 'var(--bg-card-alt)', fontWeight: 600 }}>{edificioLocked.nombre}</div>
        ) : (
          <select value={form.cliente_id} onChange={e => set({ cliente_id: e.target.value })}>
            <option value="">Seleccionar edificio...</option>
            {edificios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
      </div>
      <EmpresaSelector valor={form.empresa} empresas={empresas} onChange={v => set({ empresa: v })} onCreada={onEmpresaCreada} />
      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Obra / trabajo *</label>
        <input value={form.titulo} onChange={e => set({ titulo: e.target.value })} placeholder="Ej: Pintura total de fachada" />
      </div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Descripción</label>
        <textarea value={form.descripcion} onChange={e => set({ descripcion: e.target.value })} rows={2} placeholder="Alcance del trabajo, materiales, observaciones del contrato..."
          style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--bg-card)', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>

      <div style={seccion}>Régimen BPS</div>
      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Tipo de obra</label>
        <select value={form.tipo_obra} onChange={e => {
          const v = e.target.value as ObraFormState['tipo_obra']
          set({ tipo_obra: v, titular_bps: v === 'menor_cuantia' ? 'empresa' : v === 'administracion' ? 'edificio' : form.titular_bps })
        }}>
          {TIPOS_OBRA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {tipoInfo && <div style={{ ...ayuda, background: 'var(--bg-card-alt)', borderRadius: 7, padding: '7px 10px' }}>{tipoInfo.descripcion}</div>}
      </div>
      <div className="fgroup">
        <label>Obra inscripta a nombre de</label>
        <select value={esMenorCuantia ? 'empresa' : form.titular_bps} disabled={esMenorCuantia || form.tipo_obra === 'administracion'}
          onChange={e => set({ titular_bps: e.target.value as ObraFormState['titular_bps'] })}>
          <option value="edificio">El edificio</option>
          <option value="empresa">La empresa</option>
        </select>
        <div style={ayuda}>Define quién tiene que hacer el cierre de obra en BPS.</div>
      </div>
      {!esNueva && <>
      <div className="fgroup">
        <label>N° de obra BPS</label>
        <input value={form.nro_obra_bps} onChange={e => set({ nro_obra_bps: e.target.value })} placeholder="Opcional" />
      </div>
      <div className="fgroup">
        <label>Fecha de inscripción BPS</label>
        <DatePicker value={form.fecha_inscripcion_bps} onChange={v => set({ fecha_inscripcion_bps: v })} placeholder="Opcional" />
      </div>
      </>}

      <div style={seccion}>Contrato</div>
      <div className="fgroup">
        <label>Moneda del contrato</label>
        <select value={form.moneda} onChange={e => set({ moneda: e.target.value as ObraFormState['moneda'] })}>
          <option value="UYU">Pesos ($)</option>
          <option value="USD">Dólares (U$S)</option>
        </select>
      </div>
      <div className="fgroup">
        <label>Precio total</label>
        <input inputMode="decimal" value={form.precio_total} onChange={e => set({ precio_total: e.target.value })} placeholder="Ej: 850000" />
      </div>
      <div className="fgroup">
        <label>Firma del contrato</label>
        <DatePicker value={form.fecha_contrato} onChange={v => set({ fecha_contrato: v })} placeholder="Fecha de firma" />
      </div>
      <div className="fgroup">
        <label>Inicio de obra</label>
        <DatePicker value={form.fecha_inicio} onChange={v => set({ fecha_inicio: v })} placeholder="Fecha de inicio" />
      </div>
      <div className="fgroup">
        <label>Fin previsto</label>
        <DatePicker value={form.fecha_fin_prevista} onChange={v => set({ fecha_fin_prevista: v })} placeholder="Según contrato" />
      </div>
      {!esNueva && <>
      <div className="fgroup">
        <label>Fin real de la obra</label>
        <DatePicker value={form.fecha_fin_real} onChange={v => set({ fecha_fin_real: v })} placeholder="Cuando se termina" />
        <div style={ayuda}>Desde acá corren los 30 días para el cierre en BPS.</div>
      </div>
      </>}

      <div style={seccion}>Leyes sociales y garantía</div>
      <div className="fgroup">
        <label>Tope de leyes sociales ($)</label>
        <input inputMode="decimal" value={form.tope_leyes} onChange={e => set({ tope_leyes: e.target.value })} placeholder="Máximo que asume el edificio" />
        <div style={ayuda}>Siempre en pesos. Lo facturado por encima lo absorbe la empresa.</div>
      </div>
      <div className="fgroup">
        <label>Garantía</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="number" min={0} value={form.garantia_cantidad} style={{ width: 80 }}
            onChange={e => set({ garantia_cantidad: Math.max(0, parseInt(e.target.value) || 0) })} />
          <select value={form.garantia_unidad} onChange={e => set({ garantia_unidad: e.target.value as ObraFormState['garantia_unidad'] })} style={{ flex: 1 }}>
            <option value="anios">{form.garantia_cantidad === 1 ? 'año' : 'años'}</option>
            <option value="meses">{form.garantia_cantidad === 1 ? 'mes' : 'meses'}</option>
          </select>
        </div>
        <div style={ayuda}>
          {garantiaHasta ? <>Vence el <strong style={{ color: 'var(--text-main)' }}>{formatFecha(garantiaHasta)}</strong> (desde la firma del contrato)</> : 'Se calcula desde la firma del contrato'}
        </div>
      </div>

      {!esNueva && <>
      <div style={seccion}>Cierre de obra BPS (ex F9)</div>
      <div className="fgroup">
        <label>Estado del cierre</label>
        <select value={form.cierre_bps_estado} onChange={e => set({ cierre_bps_estado: e.target.value as ObraFormState['cierre_bps_estado'] })}>
          {CIERRES_BPS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="fgroup">
        <label>Fecha de presentación</label>
        <DatePicker value={form.cierre_bps_fecha} onChange={v => set({ cierre_bps_fecha: v })} placeholder="Cuando se presentó" />
      </div>
      </>}

      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
        <label>Nota interna</label>
        <textarea value={form.nota} onChange={e => set({ nota: e.target.value })} rows={2}
          style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--bg-card)', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
    </div>
  )
}

// Empresa: se elige de la lista, y si no está se crea ahí mismo con "+ Nueva empresa",
// sin tener que salir de la carga de la obra.
function EmpresaSelector({ valor, empresas, onChange, onCreada }: { valor: string; empresas: string[]; onChange: (v: string) => void; onCreada?: (nombre: string) => void }) {
  const supabase = createClient()
  const [creando, setCreando] = useState(false)
  const [nueva, setNueva] = useState({ nombre: '', rut: '', contacto: '', tel: '' })
  const [saving, setSaving] = useState(false)

  async function crear() {
    const nombre = nueva.nombre.trim()
    if (!nombre) { showToast('Poné el nombre de la empresa', 'error'); return }
    const existente = empresas.find(e => e.toLowerCase() === nombre.toLowerCase())
    if (existente) { onChange(existente); setCreando(false); return }
    setSaving(true)
    const payload = { nombre, rut: nueva.rut.trim() || null, contacto: nueva.contacto.trim() || null, tel: nueva.tel.trim() || null }
    const { data, error } = await supabase.from('obras_empresas').insert([payload]).select().single()
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'crear', tabla: 'obras_empresas', registroId: data?.id, descripcion: `Empresa de obras agregada (desde nueva obra): ${nombre}`, datosDespues: data })
    onCreada?.(nombre)
    onChange(nombre)
    setNueva({ nombre: '', rut: '', contacto: '', tel: '' })
    setCreando(false)
    showToast(`Empresa "${nombre}" creada`, 'success')
  }

  const inputSt: React.CSSProperties = { width: '100%', padding: '8px 11px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--bg-card)', boxSizing: 'border-box' }

  return (
    <div className="fgroup" style={{ gridColumn: 'span 2' }}>
      <label>Empresa que hace la obra</label>
      {!creando ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={valor} onChange={e => onChange(e.target.value)} style={{ flex: 1, color: valor ? 'var(--navy)' : 'var(--slate)' }}>
            <option value="">— Seleccionar empresa —</option>
            {empresas.map(e => <option key={e} value={e}>{e}</option>)}
            {valor && !empresas.includes(valor) && <option value={valor}>{valor}</option>}
          </select>
          <button type="button" className="btn-outline btn-sm" onClick={() => setCreando(true)} style={{ whiteSpace: 'nowrap' }}><Plus size={13} /> Nueva empresa</button>
        </div>
      ) : (
        <div style={{ border: '1.5px solid var(--gold)', borderRadius: 10, padding: 12, background: 'var(--bg-card-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>Nueva empresa</strong>
            <button type="button" onClick={() => setCreando(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input style={{ ...inputSt, gridColumn: 'span 2' }} value={nueva.nombre} onChange={e => setNueva(n => ({ ...n, nombre: e.target.value }))} placeholder="Nombre *" autoFocus />
            <input style={inputSt} value={nueva.rut} onChange={e => setNueva(n => ({ ...n, rut: e.target.value }))} placeholder="RUT (opcional)" />
            <input style={inputSt} value={nueva.tel} onChange={e => setNueva(n => ({ ...n, tel: e.target.value }))} placeholder="Teléfono (opcional)" />
            <input style={{ ...inputSt, gridColumn: 'span 2' }} value={nueva.contacto} onChange={e => setNueva(n => ({ ...n, contacto: e.target.value }))} placeholder="Contacto (opcional)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button type="button" className="btn-outline btn-sm" onClick={() => setCreando(false)}>Cancelar</button>
            <button type="button" className="btn-primary btn-sm" onClick={crear} disabled={saving}>{saving ? <><Loader2 size={13} className="spin" /> Creando...</> : 'Crear y elegir'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
