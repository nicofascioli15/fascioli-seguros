#!/bin/bash
set -e
mkdir -p 'app/(app)/configuracion'
cat > 'app/(app)/configuracion/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; nombre: string }
type Tabla = 'companias' | 'ramos' | 'corredores' | 'metodos_pago' | 'tipos_siniestro' | 'tipos_documento' | 'monedas'
type CampoRamo = { id: string; nombre: string; tipo: string; opciones: string | null; orden: number }

const SECCIONES: { tabla: Tabla; titulo: string; abrev: string; placeholder: string }[] = [
  { tabla: 'companias',       titulo: 'Compañías aseguradoras',   abrev: 'CIA', placeholder: 'Ej: BSE, SURA, Mapfre...' },
  { tabla: 'ramos',           titulo: 'Ramos / Tipos de seguro',  abrev: 'RAM', placeholder: 'Ej: Incendio, RC...' },
  { tabla: 'corredores',      titulo: 'Corredores',               abrev: 'COR', placeholder: 'Ej: Fascioli...' },
  { tabla: 'metodos_pago',    titulo: 'Métodos de pago',          abrev: 'PAG', placeholder: 'Ej: Transferencia...' },
  { tabla: 'tipos_siniestro', titulo: 'Tipos de siniestro',       abrev: 'SIN', placeholder: 'Ej: Choque, Robo...' },
  { tabla: 'tipos_documento', titulo: 'Tipos de documento',       abrev: 'DOC', placeholder: 'Ej: Póliza, Endoso...' },
  { tabla: 'monedas',         titulo: 'Monedas',                  abrev: 'MON', placeholder: 'Ej: U$S, $, €...' },
]

const TIPOS_CAMPO = [
  { value: 'texto',   label: 'Texto libre' },
  { value: 'numero',  label: 'Número' },
  { value: 'select',  label: 'Lista de opciones' },
  { value: 'fecha',   label: 'Fecha' },
  { value: 'boolean', label: 'Sí / No' },
]

function Seccion({ tabla, titulo, abrev, placeholder }: typeof SECCIONES[0]) {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)

  useEffect(() => { fetch() }, [])
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from(tabla).select('id, nombre').order('nombre')
    if (data) setItems(data)
    setLoading(false)
  }

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setSaving(true)
    const { error } = await supabase.from(tabla).insert([{ nombre }])
    if (error) showToast(`❌ ${error.message.includes('unique') ? 'Ya existe ese nombre' : error.message}`)
    else { setNuevo(''); showToast(`✓ "${nombre}" agregado`); await fetch() }
    setSaving(false)
  }

  async function eliminar(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) showToast('❌ No se pudo eliminar — puede estar en uso')
    else { showToast(`"${item.nombre}" eliminado`); await fetch() }
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.04em' }}>{abrev}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>{loading ? '...' : `${items.length} registros`}</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: 'var(--text-main)', transition: 'border-color .14s' }}
          onFocus={e => (e.target.style.borderColor = 'var(--gold)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
        <button className="btn-primary" onClick={agregar} disabled={saving || !nuevo.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
        </button>
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={18} style={{ display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin registros — agregá el primero arriba</div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5FB' }}>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-main)' }}>{item.nombre}</span>
            <button onClick={() => eliminar(item)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {toast && (
        <div style={{ padding: '10px 16px', background: toast.startsWith('❌') ? '#FEE2E2' : '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: toast.startsWith('❌') ? '#991B1B' : '#1A7A4E' }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Campos por ramo ──────────────────────────────────────────────────────────
function CamposRamo() {
  const supabase = createClient()
  const [ramos, setRamos]         = useState<Item[]>([])
  const [ramoSel, setRamoSel]     = useState<Item | null>(null)
  const [campos, setCampos]       = useState<CampoRamo[]>([])
  const [loading, setLoading]     = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [form, setForm]           = useState({ nombre: '', tipo: 'texto', opciones: '', con_moneda: false })
  const [editando, setEditando]   = useState<CampoRamo | null>(null)
  const [editForm, setEditForm]   = useState({ nombre: '', opciones: '' })

  useEffect(() => {
    supabase.from('ramos').select('id, nombre').order('nombre').then(({ data }) => { if (data) setRamos(data) })
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function seleccionarRamo(ramo: Item) {
    setRamoSel(ramo); setLoading(true); setShowForm(false)
    const { data } = await supabase.from('campos_ramo').select('*').eq('ramo_id', ramo.id).order('orden')
    setCampos(data || [])
    setLoading(false)
  }

  async function agregarCampo() {
    if (!ramoSel || !form.nombre.trim()) return
    setSaving(true)
    // For numeric fields with moneda, save as "numero_moneda" type and store options as monedas
    const tipoFinal = form.tipo === 'numero' && form.con_moneda ? 'numero_moneda' : form.tipo
    await supabase.from('campos_ramo').insert([{
      ramo_id: ramoSel.id,
      nombre:  form.nombre.trim(),
      tipo:    tipoFinal,
      opciones: form.tipo === 'select' ? form.opciones : null,
      orden:   campos.length,
    }])
    setForm({ nombre: '', tipo: 'texto', opciones: '', con_moneda: false })
    setShowForm(false)
    await seleccionarRamo(ramoSel)
    showToast(`Campo "${form.nombre}" agregado`)
    setSaving(false)
  }

  async function eliminarCampo(campo: CampoRamo) {
    if (!confirm(`¿Eliminar el campo "${campo.nombre}"? Se perderán los datos existentes.`)) return
    await supabase.from('campos_ramo').delete().eq('id', campo.id)
    if (ramoSel) await seleccionarRamo(ramoSel)
    showToast(`Campo "${campo.nombre}" eliminado`)
  }

  async function guardarEdicion() {
    if (!editando || !editForm.nombre.trim()) return
    setSaving(true)
    await supabase.from('campos_ramo').update({
      nombre: editForm.nombre.trim(),
      opciones: ['select'].includes(editando.tipo) ? editForm.opciones : editando.opciones,
    }).eq('id', editando.id)
    setEditando(null)
    if (ramoSel) await seleccionarRamo(ramoSel)
    showToast(`Campo "${editForm.nombre}" actualizado`)
    setSaving(false)
  }

  const tipoLabel: Record<string, string> = { texto: 'Texto', numero: 'Número', numero_moneda: 'Número + Moneda', select: 'Lista', fecha: 'Fecha', boolean: 'Sí/No' }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', overflow: 'hidden', gridColumn: 'span 2' }}>
      <div style={{ padding: '14px 18px', background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)' }}>CAM</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>Campos adicionales por ramo</div>
          <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 1 }}>Definí campos específicos para cada tipo de seguro</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 200 }}>
        {/* Ramos list */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          {ramos.map(r => (
            <div key={r.id} onClick={() => seleccionarRamo(r)}
              style={{ padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid #F1F5FB', fontSize: 13.5, fontWeight: ramoSel?.id === r.id ? 700 : 400, color: 'var(--text-main)', background: ramoSel?.id === r.id ? 'var(--gold-pale)' : 'white', borderLeft: ramoSel?.id === r.id ? '3px solid var(--gold)' : '3px solid transparent', transition: 'all .12s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {r.nombre}
              <ChevronRight size={14} color="var(--slate)" />
            </div>
          ))}
        </div>

        {/* Campos del ramo seleccionado */}
        <div style={{ padding: '16px' }}>
          {!ramoSel ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 13 }}>
              Seleccioná un ramo para ver o agregar campos
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <Loader2 size={18} style={{ display: 'block', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {ramoSel.nombre} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>— {campos.length} campos</span>
                </div>
                <button className="btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
                  <Plus size={13} /> Agregar campo
                </button>
              </div>

              {/* Form nuevo campo */}
              {showForm && (
                <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '14px', marginBottom: 14, border: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                    <div className="fgroup">
                      <label>Nombre del campo *</label>
                      <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Suma asegurada" autoFocus />
                    </div>
                    <div className="fgroup">
                      <label>Tipo de campo</label>
                      <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                        {TIPOS_CAMPO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {form.tipo === 'select' && (
                      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                        <label>Opciones (separadas por coma)</label>
                        <input value={form.opciones} onChange={e => setForm({ ...form, opciones: e.target.value })} placeholder="Ej: Global, 3x2, Solo terceros" />
                      </div>
                    )}
                    {form.tipo === 'numero' && (
                      <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
                          <input type="checkbox" checked={form.con_moneda} onChange={e => setForm({ ...form, con_moneda: e.target.checked })}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)' }} />
                          Incluir selector de moneda (ej: suma asegurada en U$S o $)
                        </label>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button className="btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                    <button className="btn-primary btn-sm" onClick={agregarCampo} disabled={saving || !form.nombre.trim()}>
                      {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar campo'}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de campos */}
              {campos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-hover)', borderRadius: 8 }}>
                  Sin campos adicionales para {ramoSel.nombre}
                </div>
              ) : campos.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-soft)', marginBottom: 6, background: 'var(--bg-card)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {tipoLabel[c.tipo] || c.tipo}
                      {c.opciones && ` · ${c.opciones}`}
                    </div>
                  </div>
                  <button onClick={() => { setEditando(c); setEditForm({ nombre: c.nombre, opciones: c.opciones || '' }) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--navy)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminarCampo(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--slate)')}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Modal editar campo */}
      {editando && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Editar campo</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, padding: '8px 12px', background: 'var(--bg-card-alt)', borderRadius: 8 }}>
              Tipo: <strong>{tipoLabel[editando.tipo] || editando.tipo}</strong> — el tipo no se puede cambiar después de creado
            </div>
            <div className="fgroup">
              <label>Nombre del campo</label>
              <input value={editForm.nombre} onChange={e => setEditForm((p: any) => ({ ...p, nombre: e.target.value }))}
                onKeyDown={(e: any) => e.key === 'Enter' && guardarEdicion()} autoFocus />
            </div>
            {editando.tipo === 'select' && (
              <div className="fgroup">
                <label>Opciones (separadas por coma)</label>
                <input value={editForm.opciones} onChange={e => setEditForm((p: any) => ({ ...p, opciones: e.target.value }))}
                  placeholder="Ej: Opción 1, Opción 2, Opción 3" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Actuales: {editando.opciones || '—'}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={saving || !editForm.nombre.trim()}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ padding: '10px 16px', background: '#E6F5EF', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: '#1A7A4E' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function PreferenciasSistema() {
  const supabase = createClient()
  const [metodos, setMetodos]           = useState<string[]>([])
  const [metodoDefault, setMetodoDefault] = useState('')
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function fetchAll() {
    setLoading(true)
    const [{ data: metodosData }, { data: configData }] = await Promise.all([
      supabase.from('metodos_pago').select('nombre').order('nombre'),
      supabase.from('configuracion_sistema').select('valor').eq('clave', 'metodo_pago_default').single(),
    ])
    if (metodosData) setMetodos(metodosData.map((m: any) => m.nombre))
    if (configData?.valor) setMetodoDefault(configData.valor)
    setLoading(false)
  }

  async function guardar(valor: string) {
    setMetodoDefault(valor)
    setSaving(true)
    await supabase.from('configuracion_sistema').upsert(
      { clave: 'metodo_pago_default', valor, updated_at: new Date().toISOString() },
      { onConflict: 'clave' }
    )
    setSaving(false)
    showToast('✓ Preferencia guardada')
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px', position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
        Preferencias
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>
        Valores por defecto
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</div>
      ) : (
        <div className="fgroup" style={{ marginBottom: 0 }}>
          <label>Método de pago por defecto al registrar un cobro</label>
          <select value={metodoDefault} onChange={e => guardar(e.target.value)} disabled={saving}>
            <option value="">— Sin preferencia (usa el primero de la lista) —</option>
            {metodos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function AvisosVencimiento() {
  const supabase = createClient()
  const [ejecutando, setEjecutando] = useState(false)
  const [resultado, setResultado]   = useState<any>(null)

  async function probarEnvio() {
    setEjecutando(true)
    setResultado(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cron/vencimientos/test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setResultado(data)
    } catch (e) {
      setResultado({ error: 'No se pudo conectar con el servidor' })
    }
    setEjecutando(false)
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', padding: '18px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
        Automatizaciones
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
        Avisos de vencimiento por email
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
        Todos los días a las 8:00 (hora Uruguay) el sistema busca pólizas que vencen en exactamente 90 o 30 días
        y envía un email automático al cliente (si tiene email cargado). Cada aviso se manda una sola vez por póliza.
      </p>
      <button className="btn-outline btn-sm" onClick={probarEnvio} disabled={ejecutando}>
        {ejecutando ? 'Ejecutando...' : 'Probar envío ahora'}
      </button>
      {resultado && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: resultado.error ? '#FEE2E2' : '#F4F7FB', borderRadius: 8, fontSize: 12.5 }}>
          {resultado.error ? (
            <span style={{ color: 'var(--danger)' }}>{resultado.error}</span>
          ) : (
            <span style={{ color: 'var(--text-main)' }}>
              {resultado.enviados} email(s) enviado(s) de {resultado.total} pólizas revisadas
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Administrá todos los catálogos del sistema</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <PreferenciasSistema />
        <AvisosVencimiento />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {SECCIONES.map(s => <Seccion key={s.tabla} {...s} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <CamposRamo />
      </div>
    </div>
  )
}


FILEEOF
git add .
git commit -m 'feat editar campos adicionales por ramo'
git push
