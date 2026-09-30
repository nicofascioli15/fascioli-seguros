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
          <div className="emp-lista">
            <div className="emp-row emp-head">
              <span>Empresa</span><span>Contacto</span><span className="emp-c">Obras abiertas</span><span className="emp-r">Le debemos</span><span />
            </div>
            {visibles.map(e => {
              const r = resumenes[e.id]
              const nCuentas = cuentasDe(e).length
              const ir = () => router.push(`/obras/empresas/${e.id}`)
              return (
                <div key={e.id} className="emp-row emp-item" role="button" tabIndex={0} onClick={ir} onKeyDown={ev => { if (ev.key === 'Enter') ir() }}>
                  <div className="emp-nombre">
                    <div className="emp-avatar"><Briefcase size={16} color="var(--gold)" /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="emp-titulo" title={e.nombre}>{e.nombre}</div>
                      <div className="emp-sub">{[e.rut && `RUT ${e.rut}`, nCuentas ? `${nCuentas} cuenta${nCuentas > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                  </div>
                  <div className="emp-contacto">
                    <div>{e.contacto || <span className="emp-muted">—</span>}</div>
                    {e.tel && <div className="emp-sub">{e.tel}</div>}
                  </div>
                  <div className="emp-c">
                    {r.total === 0 ? <span className="emp-muted">—</span> : (
                      <>
                        <span className="emp-num">{r.abiertas}</span><span className="emp-sub"> / {r.total}</span>
                        {r.atrasados > 0 && <div className="emp-alerta"><AlertTriangle size={11} /> {r.atrasados} atrasado{r.atrasados > 1 ? 's' : ''}</div>}
                      </>
                    )}
                  </div>
                  <div className="emp-r">
                    {r.saldo.length ? <strong style={{ fontSize: 14 }}>{r.saldo.map(x => formatMonto(x.monto, x.moneda)).join(' · ')}</strong> : <span className="emp-muted">—</span>}
                  </div>
                  <div className="emp-fin" onClick={ev => ev.stopPropagation()}>
                    <button className="btn-outline btn-sm emp-accion" title="Editar" onClick={() => setEditando(e)}><Pencil size={12} /></button>
                    <button className="btn-outline btn-sm emp-accion" title="Eliminar" style={{ color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setConfirmEliminar(e)}><Trash2 size={12} /></button>
                    <ChevronRight size={17} className="emp-chevron" onClick={ir} />
                  </div>
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
        .emp-lista { background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 14px; overflow: hidden; }
        .emp-row { display: grid; grid-template-columns: minmax(220px, 2.2fr) minmax(140px, 1.4fr) 120px minmax(130px, 1fr) 110px; align-items: center; gap: 14px; padding: 12px 18px; }
        .emp-head { background: var(--bg-card-alt); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding-top: 10px; padding-bottom: 10px; }
        .emp-item { border-top: 1px solid var(--border-soft); cursor: pointer; outline: none; transition: background .12s; }
        .emp-item:hover, .emp-item:focus-visible { background: var(--gold-pale); }
        .emp-nombre { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .emp-avatar { width: 36px; height: 36px; border-radius: 10px; background: var(--navy); display: grid; place-items: center; flex-shrink: 0; }
        .emp-titulo { font-weight: 800; font-size: 15px; line-height: 1.25; overflow-wrap: anywhere; }
        .emp-sub { font-size: 12px; color: var(--text-muted); }
        .emp-contacto { font-size: 13.5px; min-width: 0; overflow-wrap: anywhere; }
        .emp-muted { color: var(--text-muted); opacity: .6; }
        .emp-c { text-align: center; }
        .emp-r { text-align: right; }
        .emp-num { font-size: 16px; font-weight: 800; }
        .emp-alerta { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; color: #B91C1C; }
        .emp-fin { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
        .emp-accion { opacity: 0; transition: opacity .12s; }
        .emp-item:hover .emp-accion, .emp-item:focus-within .emp-accion { opacity: 1; }
        .emp-chevron { color: var(--text-muted); cursor: pointer; transition: transform .15s, color .15s; }
        .emp-item:hover .emp-chevron { color: var(--gold); transform: translateX(2px); }
        @media (hover: none) { .emp-accion { opacity: 1; } }
        @media (max-width: 820px) {
          .emp-head { display: none; }
          .emp-row { grid-template-columns: 1fr auto; gap: 6px 12px; }
          .emp-contacto { display: none; }
          .emp-c { text-align: left; grid-column: 1; }
          .emp-r { grid-column: 2; grid-row: 2; }
          .emp-fin { grid-column: 2; grid-row: 1; }
        }
      `}</style>
    </div>
  )
}
