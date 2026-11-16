'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, Search, Users, FileSignature, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toast'
import { traerContactos, exportarContactosExcel, type Contacto } from '@/lib/contactos'
import { formatFechaAsamblea } from '@/lib/asambleas'

export default function ContactosPage() {
  const supabase = createClient()
  const [filas, setFilas] = useState<Contacto[] | null>(null)
  const [edificio, setEdificio] = useState('')
  const [q, setQ] = useState('')
  const [incluirPoder, setIncluirPoder] = useState(true)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    traerContactos(supabase).then(setFilas).catch(e => { showToast(`No se pudieron cargar los contactos: ${e?.message || e}`, 'error'); setFilas([]) })
  }, [])

  const edificios = useMemo(() => Array.from(new Set((filas || []).map(f => f.edificio))).sort(), [filas])
  const t = q.trim().toLowerCase()
  const visibles = (filas || []).filter(f => (!edificio || f.edificio === edificio) && (incluirPoder || f.caracter === 'Propietario')
    && (!t || f.nombre.toLowerCase().includes(t) || f.telefono.includes(t) || f.unidad.toLowerCase().includes(t)))

  async function exportar() {
    if (!visibles.length) return
    setExportando(true)
    try { await exportarContactosExcel(visibles, edificio ? `Contactos - ${edificio}` : 'Contactos - todos los edificios') }
    catch (e: any) { showToast(`No se pudo exportar: ${e?.message || e}`, 'error') }
    setExportando(false)
  }

  const input: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 18px 40px' }}>
      <Link href="/hub" className="btn-outline btn-sm" style={{ display: 'inline-flex', marginBottom: 14 }}><ArrowLeft size={13} /> Portal</Link>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={22} /> Contactos</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Las personas que se registraron en las asambleas, con su teléfono, edificio y apto. Se van sumando con cada asamblea.</p>
        </div>
        <button className="btn-primary" onClick={exportar} disabled={exportando || !visibles.length}>
          {exportando ? <Loader2 size={15} className="spin" /> : <Download size={15} />} Exportar a Excel ({visibles.length})
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select style={{ ...input, minWidth: 240 }} value={edificio} onChange={e => setEdificio(e.target.value)}>
          <option value="">Todos los edificios ({edificios.length})</option>
          {edificios.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ ...input, paddingLeft: 32, width: 240 }} placeholder="Buscar nombre, teléfono o apto" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirPoder} onChange={e => setIncluirPoder(e.target.checked)} /> Incluir los que vinieron con poder
        </label>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 14, overflow: 'hidden' }}>
        {filas === null ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={22} className="spin" /></div>
          : visibles.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
              {filas.length === 0 ? 'Todavía no hay contactos: se van cargando cuando la gente se registra en las asambleas (tablet, modo sala o QR).' : 'Sin resultados'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead><tr style={{ background: 'var(--bg-card-alt)' }}>
                  {['Edificio', 'Unidad', 'Nombre', 'Teléfono', 'Carácter', 'Última asamblea'].map(h => <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {visibles.slice(0, 500).map((f, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '8px 12px' }}>{f.edificio}{f.codigo ? <span style={{ color: 'var(--text-muted)' }}> · {f.codigo}</span> : null}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 800 }}>{f.unidad}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{f.nombre || '—'}</td>
                      <td style={{ padding: '8px 12px', fontVariantNumeric: 'tabular-nums' }}>{f.telefono || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{f.caracter === 'Por poder' ? <span className="badge badge-gold"><FileSignature size={11} /> Por poder</span> : <span className="badge badge-neutral"><Home size={11} /> Propietario</span>}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{formatFechaAsamblea(f.ultima)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibles.length > 500 && <div style={{ padding: 10, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>Se muestran 500 de {visibles.length}; el Excel incluye todos.</div>}
            </div>
          )}
      </div>
    </div>
  )
}
