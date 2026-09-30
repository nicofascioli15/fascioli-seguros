'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, Search, X, Briefcase, Phone, Mail, ChevronRight, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fetchObrasCompletas, resumenEmpresa, mismaEmpresa, type ObraCompleta } from '@/lib/obrasData'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import CuentaBanco from '@/components/obras/CuentaBanco'
import CuentasEditor from '@/components/obras/CuentasEditor'
import { cuentasDe, payloadCuentas, type CuentaEmpresa } from '@/lib/cuentasEmpresa'
import { formatMonto } from '@/lib/obrasConfig'
import ConfirmDialog from '@/components/ConfirmDialog'

type Empresa = { id: string; nombre: string; rut: string | null; contacto: string | null; tel: string | null; email: string | null; banco?: string | null; nro_cuenta?: string | null; titular_cuenta?: string | null; cuentas?: any }
const vacia = { nombre: '', rut: '', contacto: '', tel: '', email: '', cuentas: [] as CuentaEmpresa[] }

export default function ObrasEmpresasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [obras, setObras] = useState<ObraCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editando, setEditando] = useState<Empresa | 'nueva' | null>(null)
  const [form, setForm] = useState(vacia)
  const [saving, setSaving] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<Empresa | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: emps }, { data: obras }] = await Promise.all([
      supabase.from('obras_empresas').select('*').order('nombre'),
      fetchObrasCompletas(supabase).then(data => ({ data })),
    ])
    setObras(obras || [])
    setEmpresas(emps || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim()) { showToast('Poné el nombre de la empresa', 'error'); return }
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), rut: form.rut.trim() || null, contacto: form.contacto.trim() || null, tel: form.tel.trim() || null, email: form.email.trim() || null, ...payloadCuentas(form.cuentas) }
    if (editando === 'nueva') {
      const { data, error } = await supabase.from('obras_empresas').insert([payload]).select().single()
      if (error) { setSaving(false); showToast(error.message.includes('unique') || error.message.includes('duplicate') ? 'Ya existe una empresa con ese nombre' : error.message, 'error'); return }
      await registrarAudit({ accion: 'crear', tabla: 'obras_empresas', registroId: data?.id, descripcion: `Empresa de obras agregada: ${payload.nombre}`, datosDespues: data })
    } else if (editando) {
      const { error } = await supabase.from('obras_empresas').update(payload).eq('id', editando.id)
      if (error) { setSaving(false); showToast(error.message, 'error'); return }
      // Si cambió el nombre, se actualiza también en las obras que la usan.
      if (editando.nombre !== payload.nombre) await supabase.from('obras').update({ empresa: payload.nombre }).ilike('empresa', editando.nombre.replace(/[%_\\]/g, m => '\\' + m))
      await registrarAudit({ accion: 'editar', tabla: 'obras_empresas', registroId: editando.id, descripcion: `Empresa de obras editada: ${payload.nombre}`, datosAntes: editando, datosDespues: payload })
    }
    setSaving(false)
    setEditando(null)
    cargar()
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setSaving(true)
    const { error } = await supabase.from('obras_empresas').delete().eq('id', confirmEliminar.id)
    if (error) { setSaving(false); showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'obras_empresas', registroId: confirmEliminar.id, descripcion: `Empresa de obras eliminada: ${confirmEliminar.nombre}`, datosAntes: confirmEliminar })
    setSaving(false)
    setConfirmEliminar(null)
    cargar()
  }

  const visibles = empresas.filter(e => !search || e.nombre.toLowerCase().includes(search.toLowerCase()) || (e.contacto || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Empresas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Contratistas que hacen obras en los edificios</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(vacia); setEditando('nueva') }}><Plus size={15} /> Nueva empresa</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 300 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}><Loader2 size={22} className="spin" /></div>
        : visibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', fontSize: 13 }}>
            {empresas.length === 0 ? 'Todavía no hay empresas. También se agregan solas cuando cargás una obra con una empresa nueva.' : 'Sin resultados'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {visibles.map(e => {
              const r = resumenEmpresa(obras.filter(o => mismaEmpresa(o.empresa, e.nombre)))
              return (
                <div key={e.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Briefcase size={17} color="var(--gold)" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{e.nombre}</div>
                      {e.rut && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>RUT {e.rut}</div>}
                    </div>
                    <button className="btn-outline btn-sm" onClick={() => { setForm({ nombre: e.nombre, rut: e.rut || '', contacto: e.contacto || '', tel: e.tel || '', email: e.email || '', cuentas: cuentasDe(e) }); setEditando(e) }}><Pencil size={12} /></button>
                    <button className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(e)}><Trash2 size={12} /></button>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {e.contacto && <span>{e.contacto}</span>}
                    {e.tel && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} /> {e.tel}</span>}
                    {e.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={12} /> {e.email}</span>}
                    {cuentasDe(e).map((c, i) => <CuentaBanco key={i} banco={c.banco} moneda={c.moneda} cuenta={c.nro_cuenta} titular={c.titular} empresa={e.nombre} />)}
                  </div>
                  <button onClick={() => router.push(`/obras/empresas/${e.id}`)} title="Ver la ficha de la empresa"
                    style={{ marginTop: 'auto', textAlign: 'left', background: 'var(--bg-card-alt)', border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{r.abiertas}</strong> abierta{r.abiertas === 1 ? '' : 's'} · {r.total} obra{r.total === 1 ? '' : 's'}
                      {r.saldo.length > 0 && <> · le debemos <strong>{r.saldo.map(x => formatMonto(x.monto, x.moneda)).join(' · ')}</strong></>}
                      {r.atrasados > 0 && <span style={{ color: '#B91C1C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6 }}><AlertTriangle size={11} /> {r.atrasados} atrasado{r.atrasados > 1 ? 's' : ''}</span>}
                    </span>
                    <span style={{ color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>Ver ficha <ChevronRight size={14} /></span>
                  </button>
                </div>
              )
            })}
          </div>
        )}

      {editando && (
        <div className="pago-overlay open" onClick={ev => { if (ev.target === ev.currentTarget && !saving) setEditando(null) }}>
          <div className="pago-modal" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={ev => ev.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>{editando === 'nueva' ? 'Nueva empresa' : 'Editar empresa'}</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Nombre *</label><input value={form.nombre} onChange={ev => setForm(f => ({ ...f, nombre: ev.target.value }))} /></div>
              <div className="fgroup"><label>RUT</label><input value={form.rut} onChange={ev => setForm(f => ({ ...f, rut: ev.target.value }))} /></div>
              <div className="fgroup"><label>Contacto</label><input value={form.contacto} onChange={ev => setForm(f => ({ ...f, contacto: ev.target.value }))} /></div>
              <div className="fgroup"><label>Teléfono</label><input value={form.tel} onChange={ev => setForm(f => ({ ...f, tel: ev.target.value }))} /></div>
              <div className="fgroup"><label>Email</label><input value={form.email} onChange={ev => setForm(f => ({ ...f, email: ev.target.value }))} /></div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}><label>Cuentas bancarias</label>
                <CuentasEditor cuentas={form.cuentas} onChange={c => setForm(f => ({ ...f, cuentas: c }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title={`¿Eliminar "${confirmEliminar?.nombre}"?`}
        message="Se quita del catálogo. Las obras que ya la tienen cargada no se modifican."
        loading={saving}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  )
}
