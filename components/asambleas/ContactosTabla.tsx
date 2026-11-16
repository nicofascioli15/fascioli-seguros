'use client'
import { useState } from 'react'
import { Pencil, Trash2, X, FileSignature, Home, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatFechaAsamblea } from '@/lib/asambleas'
import { editarContacto, quitarContacto, type Contacto } from '@/lib/contactos'

// Tabla de contactos con corregir y quitar (para limpiar los de prueba o datos mal cargados)
export default function ContactosTabla({ lista, mostrarEdificio, onCambio, max = 500 }: { lista: Contacto[]; mostrarEdificio?: boolean; onCambio: () => void; max?: number }) {
  const supabase = createClient()
  const [editando, setEditando] = useState<Contacto | null>(null)
  const [borrar, setBorrar] = useState<Contacto | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  async function quitar() {
    if (!borrar) return
    setTrabajando(true)
    try {
      await quitarContacto(supabase, borrar)
      await registrarAudit({ accion: 'editar', tabla: 'asamblea_unidades', descripcion: `Contacto quitado: ${borrar.nombre} (${borrar.telefono}) — ${borrar.edificio} ${borrar.unidad}` })
      showToast('Contacto quitado', 'success')
      onCambio()
    } catch (e: any) { showToast(e?.message || 'No se pudo quitar', 'error') }
    setTrabajando(false); setBorrar(null)
  }

  const th: React.CSSProperties = { textAlign: 'left', padding: '9px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '8px 12px' }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr style={{ background: 'var(--bg-card-alt)' }}>
            {mostrarEdificio && <th style={th}>Edificio</th>}
            <th style={th}>Unidad</th><th style={th}>Nombre</th><th style={th}>Teléfono</th><th style={th}>Carácter</th><th style={th}>Última asamblea</th><th style={th} />
          </tr></thead>
          <tbody>
            {lista.slice(0, max).map((f, i) => (
              <tr key={f.filas[0]?.id || i} style={{ borderTop: '1px solid var(--border-soft)' }}>
                {mostrarEdificio && <td style={td}>{f.edificio}{f.codigo ? <span style={{ color: 'var(--text-muted)' }}> · {f.codigo}</span> : null}</td>}
                <td style={{ ...td, fontWeight: 800 }}>{f.unidad}</td>
                <td style={{ ...td, fontWeight: 600 }}>{f.nombre || '—'}</td>
                <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{f.telefono || '—'}</td>
                <td style={td}>{f.caracter === 'Por poder' ? <span className="badge badge-gold"><FileSignature size={11} /> Por poder</span> : <span className="badge badge-neutral"><Home size={11} /> Propietario</span>}</td>
                <td style={{ ...td, color: 'var(--text-muted)' }}>{formatFechaAsamblea(f.ultima)}{f.asambleas > 1 ? ` (${f.asambleas})` : ''}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn-outline btn-sm" title="Corregir" onClick={() => setEditando(f)}><Pencil size={12} /></button>
                  <button className="btn-outline btn-sm" title="Quitar de contactos" style={{ marginLeft: 6, color: 'var(--danger)', borderColor: '#FEE2E2' }} onClick={() => setBorrar(f)}><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length > max && <div style={{ padding: 10, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>Se muestran {max} de {lista.length}; el Excel incluye todos.</div>}
      </div>

      {editando && <EditarContacto c={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); onCambio() }} />}
      <ConfirmDialog open={!!borrar} title={`¿Quitar a ${borrar?.nombre || 'este contacto'}?`}
        message="Deja de aparecer en Contactos y en el Excel. No cambia las actas, la asistencia ni los votos de las asambleas."
        confirmLabel="Quitar" loading={trabajando} onConfirm={quitar} onCancel={() => setBorrar(null)} />
    </>
  )
}

function EditarContacto({ c, onClose, onSaved }: { c: Contacto; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [nombre, setNombre] = useState(c.nombre)
  const [tel, setTel] = useState(c.telefono)
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    if (!nombre.trim()) { showToast('Poné el nombre', 'error'); return }
    setGuardando(true)
    try {
      await editarContacto(supabase, c, nombre, tel)
      await registrarAudit({ accion: 'editar', tabla: 'asamblea_unidades', descripcion: `Contacto corregido: ${c.nombre} (${c.telefono}) → ${nombre} (${tel}) — ${c.edificio} ${c.unidad}` })
      showToast('Contacto corregido', 'success')
      onSaved()
    } catch (e: any) { showToast(e?.message || 'No se pudo guardar', 'error') }
    setGuardando(false)
  }
  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !guardando) onClose() }}>
      <div className="pago-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Corregir contacto</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>{c.edificio} · unidad {c.unidad}{c.asambleas > 1 ? ` · se corrige en sus ${c.asambleas} asambleas` : ''}</div>
        <div className="fgroup"><label>Nombre y apellido</label><input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus /></div>
        <div className="fgroup"><label>Teléfono</label><input inputMode="tel" value={tel} onChange={e => setTel(e.target.value)} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? <Loader2 size={14} className="spin" /> : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
