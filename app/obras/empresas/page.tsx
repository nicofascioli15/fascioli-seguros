'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, Search, Briefcase, ChevronRight, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fetchObrasCompletas, resumenEmpresa, mismaEmpresa, type ObraCompleta, type ResumenEmpresa } from '@/lib/obrasData'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { formatMonto } from '@/lib/obrasConfig'
import { cuentasDe } from '@/lib/cuentasEmpresa'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmpresaModal, { type EmpresaObra } from '@/components/obras/EmpresaModal'

// Lista de empresas: tarjetas compactas y clickeables. Todo el detalle está en la ficha (/obras/empresas/[id]).
export default function ObrasEmpresasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [empresas, setEmpresas] = useState<EmpresaObra[]>([])
  const [obras, setObras] = useState<ObraCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editando, setEditando] = useState<EmpresaObra | 'nueva' | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<EmpresaObra | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: emps }, obs] = await Promise.all([
      supabase.from('obras_empresas').select('*').order('nombre'),
      fetchObrasCompletas(supabase),
    ])
    setEmpresas(emps || [])
    setObras(obs)
    setLoading(false)
  }

  async function eliminar() {
    if (!confirmEliminar) return
    setEliminando(true)
    const { error } = await supabase.from('obras_empresas').delete().eq('id', confirmEliminar.id)
    if (error) { setEliminando(false); showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'eliminar', tabla: 'obras_empresas', registroId: confirmEliminar.id, descripcion: `Empresa de obras eliminada: ${confirmEliminar.nombre}`, datosAntes: confirmEliminar })
    setEliminando(false)
    setConfirmEliminar(null)
    cargar()
  }

  const q = search.trim().toLowerCase()
  const visibles = empresas.filter(e => !q || e.nombre.toLowerCase().includes(q) || (e.contacto || '').toLowerCase().includes(q) || (e.rut || '').toLowerCase().includes(q))
  const resumenes: Record<string, ResumenEmpresa> = {}
  empresas.forEach(e => { resumenes[e.id] = resumenEmpresa(obras.filter(o => mismaEmpresa(o.empresa, e.nombre))) })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Empresas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Contratistas que hacen obras en los edificios · tocá una para ver su ficha</p>
        </div>
        <button className="btn-primary" onClick={() => setEditando('nueva')}><Plus size={15} /> Nueva empresa</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input placeholder="Buscar empresa, contacto o RUT..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}><Loader2 size={22} className="spin" /></div>
        : visibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)', fontSize: 13 }}>
            {empresas.length === 0 ? 'Todavía no hay empresas. También se agregan solas cuando cargás una obra con una empresa nueva.' : 'Sin resultados'}
          </div>
        ) : (
          <div className="emp-grid">
            {visibles.map(e => {
              const r = resumenes[e.id]
              const nCuentas = cuentasDe(e).length
              return (
                <div key={e.id} className="emp-card" role="button" tabIndex={0}
                  onClick={() => router.push(`/obras/empresas/${e.id}`)}
                  onKeyDown={ev => { if (ev.key === 'Enter') router.push(`/obras/empresas/${e.id}`) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="emp-avatar"><Briefcase size={18} color="var(--gold)" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {[e.rut && `RUT ${e.rut}`, e.contacto, nCuentas ? `${nCuentas} cuenta${nCuentas > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                      </div>
                    </div>
                    <div className="emp-acciones" onClick={ev => ev.stopPropagation()}>
                      <button className="btn-outline btn-sm" title="Editar" onClick={() => setEditando(e)}><Pencil size={12} /></button>
                      <button className="btn-outline btn-sm" title="Eliminar" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(e)}><Trash2 size={12} /></button>
                    </div>
                    <ChevronRight size={18} className="emp-chevron" />
                  </div>

                  <div className="emp-resumen">
                    <div>
                      <div className="emp-num">{r.abiertas}</div>
                      <div className="emp-lbl">abierta{r.abiertas === 1 ? '' : 's'} de {r.total}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      {r.saldo.length ? (
                        <>
                          <div className="emp-lbl">Le debemos</div>
                          <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.saldo.map(s => formatMonto(s.monto, s.moneda)).join(' · ')}</div>
                        </>
                      ) : <div className="emp-lbl" style={{ paddingTop: 8 }}>{r.total ? 'Sin saldo pendiente' : 'Sin obras todavía'}</div>}
                    </div>
                  </div>
                  {r.atrasados > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#B91C1C' }}>
                      <AlertTriangle size={13} /> {r.atrasados} pago{r.atrasados > 1 ? 's' : ''} atrasado{r.atrasados > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      {editando && (
        <EmpresaModal empresa={editando === 'nueva' ? null : editando} onClose={() => setEditando(null)}
          onSaved={({ id }) => { const eraNueva = editando === 'nueva'; setEditando(null); if (eraNueva && id) router.push(`/obras/empresas/${id}`); else cargar() }} />
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title={`¿Eliminar "${confirmEliminar?.nombre}"?`}
        message="Se quita del catálogo. Las obras que ya la tienen cargada no se modifican."
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmEliminar(null)}
      />

      <style>{`
        .emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
        .emp-card { background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; cursor: pointer; outline: none;
          transition: transform .16s, box-shadow .16s, border-color .16s; }
        .emp-card:hover, .emp-card:focus-visible { transform: translateY(-2px); border-color: var(--gold); box-shadow: 0 12px 26px -14px rgba(15,30,53,.3); }
        .emp-avatar { width: 40px; height: 40px; border-radius: 11px; background: var(--navy); display: grid; place-items: center; flex-shrink: 0; }
        .emp-acciones { display: flex; gap: 4px; opacity: 0; transition: opacity .15s; }
        .emp-card:hover .emp-acciones, .emp-card:focus-within .emp-acciones { opacity: 1; }
        @media (hover: none) { .emp-acciones { opacity: 1; } }
        .emp-chevron { color: var(--text-muted); flex-shrink: 0; transition: transform .16s, color .16s; }
        .emp-card:hover .emp-chevron { color: var(--gold); transform: translateX(2px); }
        .emp-resumen { display: flex; align-items: flex-end; gap: 12px; background: var(--bg-card-alt); border-radius: 10px; padding: 10px 12px; }
        .emp-num { font-size: 22px; font-weight: 800; line-height: 1; }
        .emp-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); margin-top: 3px; }
      `}</style>
    </div>
  )
}
