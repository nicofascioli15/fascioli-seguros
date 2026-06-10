#!/bin/bash
set -e
cat > app/clientes/ClientesList.tsx << 'FILEEOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Loader2, Upload, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Cliente = {
  id: string
  nombre: string
  direccion: string
  contacto: string
  tel: string
  email: string
}

type Props = { onSelect: (id: string, nombre: string) => void }

export default function ClientesList({ onSelect }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
  const supabase                = createClient()
  const csvRef                  = useRef<HTMLInputElement>(null)
  const [showImport, setShowImport] = useState(false)
  const [csvPreview, setCsvPreview] = useState<{rows: Omit<Cliente,'id'>[]; errors: string[]}>({ rows: [], errors: [] })
  const [importing, setImporting]   = useState(false)
  const [importDone, setImportDone] = useState<{ok:number;skip:number} | null>(null)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre')
    if (!error && data) setClientes(data)
    setLoading(false)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const { error } = await supabase.from('clientes').insert([form])
    if (!error) {
      setForm({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
      setShowModal(false)
      await fetchClientes()
    }
    setSaving(false)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán también sus pólizas.`)) return
    await supabase.from('clientes').delete().eq('id', id)
    await fetchClientes()
  }

  function descargarPlantilla() {
    const csv = [
      'nombre,direccion,contacto,tel,email',
      'Le Mans,Av. Italia 1234,Juan Pérez,099123456,juan@lemans.com.uy',
      'Sea Park,Bvar. España 567,María García,098765432,',
      'Rocamar,,,,'
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'plantilla_clientes_fascioli.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseCsv(text: string) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return { rows: [], errors: ['El archivo está vacío o no tiene datos'] }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, ''))
    const errors: string[] = []
    const rows: Omit<Cliente,'id'>[] = []

    // Detect column positions flexibly
    const idx = {
      nombre:    header.findIndex(h => h.includes('nombre') || h.includes('name')),
      direccion: header.findIndex(h => h.includes('direcci') || h.includes('address') || h.includes('domicilio')),
      contacto:  header.findIndex(h => h.includes('contacto') || h.includes('contact') || h.includes('administrador')),
      tel:       header.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('celular')),
      email:     header.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('correo')),
    }

    if (idx.nombre === -1) {
      return { rows: [], errors: ['No se encontró columna "nombre" en el CSV'] }
    }

    lines.slice(1).forEach((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const nombre = idx.nombre >= 0 ? cols[idx.nombre] : ''
      if (!nombre) { errors.push(`Fila ${i+2}: nombre vacío, se omite`); return }
      rows.push({
        nombre,
        direccion: idx.direccion >= 0 ? (cols[idx.direccion] || '') : '',
        contacto:  idx.contacto  >= 0 ? (cols[idx.contacto]  || '') : '',
        tel:       idx.tel       >= 0 ? (cols[idx.tel]        || '') : '',
        email:     idx.email     >= 0 ? (cols[idx.email]      || '') : '',
      })
    })

    return { rows, errors }
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCsv(text)
      setCsvPreview(result)
      setShowImport(true)
      setImportDone(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function confirmarImport() {
    if (csvPreview.rows.length === 0) return
    setImporting(true)
    let ok = 0, skip = 0

    // Insert in batches of 50
    const batch = csvPreview.rows
    const { data, error } = await supabase.from('clientes').insert(batch).select()
    if (error) {
      // Try one by one to skip duplicates
      for (const row of batch) {
        const { error: e } = await supabase.from('clientes').insert([row])
        if (e) skip++
        else ok++
      }
    } else {
      ok = data?.length || batch.length
    }

    setImporting(false)
    setImportDone({ ok, skip })
    await fetchClientes()
  }

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Clientes</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>{clientes.length} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => { setShowImport(true); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>
            <Upload size={15} /> Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); e.target.value = '' }} />
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 340, background: 'white', color: 'var(--navy)' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--slate)' }}>
          <Loader2 size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
          <div>Cargando clientes...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtrados.map(c => (
            <div key={c.id} className="edif-card" onClick={() => onSelect(c.id, c.nombre)}>
              <div className="edif-avatar">{c.nombre.trim()[0]?.toUpperCase() || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="edif-name">{c.nombre}</div>
                <div className="edif-addr">{c.direccion || 'Sin dirección registrada'}</div>
                {c.contacto && <div style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 2 }}>{c.contacto}</div>}
              </div>
              <button className="edif-del-btn" onClick={e => { e.stopPropagation(); eliminar(c.id, c.nombre) }} title="Eliminar">
                <X size={15} />
              </button>
            </div>
          ))}
          {!loading && filtrados.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
              {search ? 'No se encontraron clientes' : (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}></div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay clientes aún</div>
                  <div style={{ fontSize: 12 }}>Agregá el primer cliente con el botón de arriba</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo cliente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Nombre del cliente *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del edificio o cliente" autoFocus />
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Dirección</label>
                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Av. Italia 7191, Montevideo" />
              </div>
              <div className="fgroup">
                <label>Contacto</label>
                <input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del administrador" />
              </div>
              <div className="fgroup">
                <label>Teléfono</label>
                <input value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} placeholder="09X XXX XXX" />
              </div>
              <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@cliente.com" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? <><Loader2 size={14} /> Guardando...</> : 'Guardar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importar CSV */}
      {showImport && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) } }}>
          <div className="pago-modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Importar clientes desde CSV</h3>
              <button onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {importDone ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E6F5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle size={24} color="var(--success)" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>Importación completada</div>
                <div style={{ fontSize: 14, color: 'var(--slate)' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>{importDone.ok} clientes importados</span>
                  {importDone.skip > 0 && <span> · {importDone.skip} omitidos</span>}
                </div>
                <button className="btn-primary" style={{ marginTop: 20 }}
                  onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }); setImportDone(null) }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                {/* Guía de columnas */}
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ background: '#F4F7FB', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Columnas requeridas (en este orden)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                      {[
                        { col: 'nombre',    req: true,  desc: 'Obligatorio' },
                        { col: 'direccion', req: false, desc: 'Opcional' },
                        { col: 'contacto',  req: false, desc: 'Opcional' },
                        { col: 'tel',       req: false, desc: 'Opcional' },
                        { col: 'email',     req: false, desc: 'Opcional' },
                      ].map(c => (
                        <div key={c.col} style={{ textAlign: 'center', background: 'white', borderRadius: 7, padding: '7px 6px', border: `1.5px solid ${c.req ? 'var(--gold)' : 'var(--border)'}` }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: c.req ? 'var(--navy)' : 'var(--slate)' }}>{c.col}</div>
                          <div style={{ fontSize: 10, color: c.req ? 'var(--gold)' : 'var(--slate)', marginTop: 2 }}>{c.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn-outline" onClick={descargarPlantilla} style={{ fontSize: 13, width: '100%', justifyContent: 'center' }}>
                    <Download size={14} /> Descargar plantilla CSV lista para completar
                  </button>
                </div>

                {/* Errores */}
                {csvPreview.errors.length > 0 && (
                  <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    {csvPreview.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: '#92400E', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {e}
                      </div>
                    ))}
                  </div>
                )}

                {csvPreview.rows.length === 0 && csvPreview.errors.length === 0 ? (
                  // Estado inicial — zona de drop/click
                  <div
                    onClick={() => csvRef.current?.click()}
                    style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 24px', textAlign: 'center', cursor: 'pointer', background: '#FAFBFC', transition: 'all .2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = '#FAFBFC' }}
                  >
                    <Upload size={26} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--slate)' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 4 }}>Seleccionar archivo CSV</div>
                    <div style={{ fontSize: 12.5, color: 'var(--slate)' }}>Hacé click acá o arrastrá tu archivo</div>
                  </div>
                ) : csvPreview.rows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--slate)', fontSize: 13 }}>
                    No se encontraron filas válidas en el archivo
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>
                      Vista previa — {csvPreview.rows.length} clientes a importar
                    </div>
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC' }}>
                            {['Nombre','Dirección','Contacto','Tel','Email'].map(h => (
                              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.rows.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #F1F5FB' }}>
                              <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}>{r.nombre}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.direccion || '—'}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.contacto || '—'}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.tel || '—'}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--slate)' }}>{r.email || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <button className="btn-outline" onClick={() => csvRef.current?.click()}>
                        <Upload size={14} /> Cambiar archivo
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-outline" onClick={() => { setShowImport(false); setCsvPreview({ rows: [], errors: [] }) }}>Cancelar</button>
                        <button className="btn-primary" onClick={confirmarImport} disabled={importing}>
                          {importing
                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
                            : <>Importar {csvPreview.rows.length} clientes</>}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

FILEEOF
echo 'Listo'
echo '   git add .'
echo '   git commit -m "fix: modal CSV restaurado, flujo correcto"'
echo '   git push'
