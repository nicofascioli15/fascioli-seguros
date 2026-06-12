#!/bin/bash
set -e
mkdir -p 'app/(app)/vencimientos' 'app/(app)/clientes' 'app/(app)/polizas'
cat > 'app/(app)/vencimientos/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Search, Phone, Mail, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Item = {
  id: string
  numero: string
  ramo: string
  compania: string
  vencimiento: string | null
  corredor: string
  moneda: string
  cliente_nombre: string
  cliente_tel: string
  cliente_email: string
  dias: number | null
}

export default function VencimientosPage() {
  const supabase = createClient()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtro, setFiltro]   = useState(90)

  useEffect(() => { fetchVencimientos() }, [])

  async function fetchVencimientos() {
    setLoading(true)
    const { data } = await supabase
      .from('polizas')
      .select('id, numero, ramo, compania, vencimiento, corredor, moneda, clientes(nombre, tel, email)')
      .order('vencimiento', { ascending: true })

    if (data) {
      setItems(data.map(p => ({
        id:              p.id,
        numero:          p.numero,
        ramo:            p.ramo,
        compania:        p.compania,
        vencimiento:     p.vencimiento,
        corredor:        p.corredor,
        moneda:          p.moneda,
        cliente_nombre:  (p.clientes as any)?.nombre || '—',
        cliente_tel:     (p.clientes as any)?.tel || '',
        cliente_email:   (p.clientes as any)?.email || '',
        dias:            diasHasta(p.vencimiento),
      })))
    }
    setLoading(false)
  }

  const filtrados = items.filter(v => {
    const q = search.toLowerCase()
    const matchQ = !q || v.cliente_nombre.toLowerCase().includes(q) || v.numero.toLowerCase().includes(q)
    if (filtro === 0)  return matchQ && v.dias !== null && v.dias < 0
    if (filtro === -1) return matchQ
    return matchQ && v.dias !== null && v.dias >= 0 && v.dias <= filtro
  })

  const urgentes   = filtrados.filter(v => v.dias !== null && v.dias >= 0 && v.dias <= 7)
  const proximos   = filtrados.filter(v => v.dias !== null && v.dias > 7 && v.dias <= 30)
  const planificados = filtrados.filter(v => v.dias !== null && v.dias > 30)
  const vencidas   = filtrados.filter(v => v.dias !== null && v.dias < 0)

  function Section({ title, items, dotColor }: { title: string; items: Item[]; dotColor: string }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{title}</h2>
          <span style={{ fontSize: 12, color: 'var(--slate)', background: '#EEF2F8', padding: '2px 8px', borderRadius: 10 }}>{items.length}</span>
        </div>
        {items.map(v => (
          <div key={v.id} style={{
            background: 'white', borderRadius: 12, border: '1px solid var(--border)',
            padding: '16px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14,
            borderLeft: `3px solid ${dotColor}`
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 10, flexShrink: 0,
              background: v.dias !== null && v.dias < 0 ? '#FEE2E2' : v.dias !== null && v.dias <= 7 ? '#FEE2E2' : v.dias !== null && v.dias <= 30 ? '#FEF3C7' : '#EEF2F8',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: v.dias !== null && v.dias < 0 ? '#991B1B' : v.dias !== null && v.dias <= 7 ? '#991B1B' : v.dias !== null && v.dias <= 30 ? '#92400E' : 'var(--navy)' }}>
                {v.dias !== null ? Math.abs(v.dias) : '?'}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: .7, color: 'var(--slate)' }}>
                {v.dias !== null && v.dias < 0 ? 'venc.' : 'días'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{v.cliente_nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-neutral">{v.ramo}</span>
                <span style={{ fontFamily: 'monospace' }}>{v.numero}</span>
                <span>{v.compania}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Vence</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatFecha(v.vencimiento)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                {v.cliente_tel && <a href={`tel:${v.cliente_tel}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Phone size={12} /></a>}
                {v.cliente_email && <a href={`mailto:${v.cliente_email}`} className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11 }}><Mail size={12} /></a>}
                {v.cliente_tel && <a href={`https://wa.me/${v.cliente_tel.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn-outline btn-sm" style={{ textDecoration: 'none', fontSize: 11, color: '#25D366', borderColor: '#25D366' }}><MessageCircle size={12} /></a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Vencimientos</h1>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>Pólizas ordenadas por proximidad de vencimiento</p>
      </div>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Vencidas',    count: vencidas.length,    bg: '#FEE2E2', color: '#991B1B' },
          { label: '≤ 7 días',   count: urgentes.length,    bg: '#FEE2E2', color: '#991B1B' },
          { label: '8–30 días',  count: proximos.length,    bg: '#FEF3C7', color: '#92400E' },
          { label: '31–90 días', count: planificados.length, bg: '#EEF2F8', color: 'var(--navy)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, color: s.color, opacity: .8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{l:'30 días',v:30},{l:'90 días',v:90},{l:'180 días',v:180},{l:'Vencidas',v:0},{l:'Todas',v:-1}].map(t =>
            <button key={t.v} onClick={() => setFiltro(t.v)} className={`filter-btn ${filtro === t.v ? 'active' : ''}`}>{t.l}</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Cargando vencimientos...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--slate)', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin vencimientos en este rango</div>
          <div style={{ fontSize: 12 }}>Probá cambiando el filtro o agregando pólizas con fecha de vencimiento</div>
        </div>
      ) : (
        <>
          <Section title="Vencidas" items={vencidas} dotColor="#D94F4F" />
          <Section title="Urgentes — vencen en 7 días o menos" items={urgentes} dotColor="#D94F4F" />
          <Section title="Próximas — 8 a 30 días" items={proximos} dotColor="#D97706" />
          <Section title="Planificadas — 31 a 90 días" items={planificados} dotColor="#4A80D4" />
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

FILEEOF
echo '+ app/(app)/vencimientos/page.tsx'

cat > 'app/(app)/clientes/ClientesList.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Loader2, Upload, CheckCircle, AlertCircle, Download, Phone, Mail, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'

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
    const { error, data } = await supabase.from('clientes').insert([form]).select().single()
    if (!error && data) {
      await registrarAudit({ accion: 'crear', tabla: 'clientes', registroId: data.id, descripcion: `Cliente creado: ${form.nombre}`, datosDespues: data })
      setForm({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
      setShowModal(false)
      await fetchClientes()
    }
    setSaving(false)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán también sus pólizas.`)) return
    const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
    await supabase.from('clientes').delete().eq('id', id)
    await registrarAudit({ accion: 'eliminar', tabla: 'clientes', registroId: id, descripcion: `Cliente eliminado: ${nombre}`, datosAntes: data })
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
echo '+ app/(app)/clientes/ClientesList.tsx'

cat > 'app/(app)/polizas/page.tsx' << 'FILEEOF'
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Plus, Search, X, ChevronRight, Loader2, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import DatePicker from '@/components/DatePicker'

// Catalogs loaded from Supabase

function diasHasta(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso), hoy = new Date()
  hoy.setHours(0,0,0,0)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function estadoBadge(venc: string | null) {
  const d = diasHasta(venc)
  if (d === null) return { label: 'Sin fecha', cls: 'badge-neutral' }
  if (d < 0)     return { label: 'Vencida',   cls: 'badge-danger' }
  if (d <= 30)   return { label: `${d}d`,     cls: 'badge-danger' }
  if (d <= 90)   return { label: `${d}d`,     cls: 'badge-warning' }
  return               { label: formatFecha(venc), cls: 'badge-success' }
}
// Convierte array de fechas a string legible
function fechasACuotaMes(fechas: string[]): string {
  return fechas.map((f, i) => {
    if (!f) return `${i+1}/?`
    const [y,m,d] = f.split('-')
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    return `${i+1}/${d}/${meses[parseInt(m)-1]}/${y.slice(2)}`
  }).join(' - ')
}

function addMonthsAndDays(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const newDay = d + months
  const targetMonthRaw = m - 1 + months
  const targetYear  = y + Math.floor(targetMonthRaw / 12)
  const targetMonth = targetMonthRaw % 12
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(Math.min(newDay, maxDay)).padStart(2,'0')}`
}

function CuotasFechas({ cuotas, value, onChange }: {
  cuotas: number; value: string[]; onChange: (v: string[]) => void
}) {
  if (cuotas === 0) return (
    <div style={{ padding: '12px', background: '#F4F7FB', borderRadius: 8, fontSize: 13, color: 'var(--slate)', textAlign: 'center' }}>
      Ingresá la cantidad de cuotas primero
    </div>
  )
  const dates = Array.from({ length: cuotas }, (_, i) => value[i] || '')

  function handleChange(idx: number, val: string) {
    const next = [...dates]
    next[idx] = val
    if (idx === 0 && val) {
      for (let i = 1; i < cuotas; i++) {
        if (!next[i]) next[i] = addMonthsAndDays(val, i)
      }
    }
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
      {dates.map((fecha, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: fecha ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: fecha ? 'var(--gold)' : 'var(--slate)', flexShrink: 0 }}>{i+1}</div>
          <div style={{ flex: 1 }}>
            <DatePicker value={fecha} onChange={val => handleChange(i, val)}
              placeholder={i === 0 ? 'Fecha 1ª cuota (auto-completa las siguientes)' : `Fecha cuota ${i+1}`} />
          </div>
          {i === 0 && fecha && cuotas > 1 && (
            <button onClick={() => onChange(Array.from({ length: cuotas }, (_, j) => addMonthsAndDays(fecha, j)))}
              style={{ flexShrink: 0, padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
              Recalcular
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Tipos ────────────────────────────────────────────────────────────────────
type Cliente = { id: string; nombre: string; direccion: string }
type Poliza  = { id: string; numero: string; ramo: string; compania: string; vencimiento: string | null; corredor: string; moneda: string; cuotas: number; cuota_mes: string; cliente_id: string; clientes?: { nombre: string }; doc_count?: number }

// Pasos del modal
type Paso = 'cliente' | 'poliza'

export default function PolizasPage() {
  const supabase = createClient()

  const [catalogos, setCatalogos] = useState<{ramos:string[];companias:string[];corredores:string[];monedas:string[]}>({ramos:[],companias:[],corredores:[],monedas:[]})
  const [polizas, setPolizas]         = useState<Poliza[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtroRamo, setFiltroRamo]   = useState('Todos')

  // Modal nueva póliza
  const [showModal, setShowModal]     = useState(false)
  const [paso, setPaso]               = useState<Paso>('cliente')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({
    ramo: '', compania: '', numero: '', vencimiento: '',
    corredor: '', moneda: '', cuotas: '', fechasCuotas: [] as string[], nota: ''
  })

  useEffect(() => {
    fetchPolizas()
    fetchClientes()
    fetchCatalogos()
  }, [])

  async function fetchPolizas() {
    setLoading(true)
    const { data } = await supabase
      .from('polizas')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
    if (data) {
      // Count docs per poliza
      const ids = data.map((p: any) => p.id)
      const { data: docs } = await supabase
        .from('documentos')
        .select('poliza_id')
        .in('poliza_id', ids)
      const countMap: Record<string, number> = {}
      ;(docs || []).forEach((d: any) => { countMap[d.poliza_id] = (countMap[d.poliza_id] || 0) + 1 })
      setPolizas(data.map((p: any) => ({ ...p, doc_count: countMap[p.id] || 0 })))
    }
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre, direccion').order('nombre')
    if (data) setClientes(data)
  }

  async function fetchCatalogos() {
    const [r, c, co, m] = await Promise.all([
      supabase.from('ramos').select('nombre').order('nombre'),
      supabase.from('companias').select('nombre').order('nombre'),
      supabase.from('corredores').select('nombre').order('nombre'),
      supabase.from('monedas').select('nombre').order('nombre'),
    ])
    setCatalogos({
      ramos:     (r.data || []).map((x:any) => x.nombre),
      companias: (c.data || []).map((x:any) => x.nombre),
      corredores:(co.data || []).map((x:any) => x.nombre),
      monedas:   (m.data || []).map((x:any) => x.nombre),
    })
  }

  async function guardarPoliza() {
    if (!clienteSeleccionado || !form.numero.trim()) return
    const nCuotas = parseInt(form.cuotas) || 0
    if (nCuotas < 1) { alert('Ingresá al menos 1 cuota'); return }
    if (!form.fechasCuotas[0]) { alert('Ingresá la fecha de la primera cuota'); return }
    const faltantes = form.fechasCuotas.slice(0, nCuotas).filter(f => !f).length
    if (faltantes > 0) { alert(`Faltan ${faltantes} fechas de cuotas`); return }
    setSaving(true)
    const { error } = await supabase.from('polizas').insert([{
      cliente_id:  clienteSeleccionado.id,
      ramo:        form.ramo,
      compania:    form.compania,
      numero:      form.numero,
      vencimiento: form.vencimiento || null,
      corredor:    form.corredor,
      moneda:      form.moneda,
      cuotas:      parseInt(form.cuotas) || 0,
      cuota_mes:   fechasACuotaMes(form.fechasCuotas),
      nota:        form.nota || null,
    }])
    if (!error) {
      cerrarModal()
      await fetchPolizas()
    }
    setSaving(false)
  }

  function abrirModal() {
    setPaso('cliente')
    setClienteSearch('')
    setClienteSeleccionado(null)
    setForm({ ramo: '', compania: '', numero: '', vencimiento: '', corredor: '', moneda: '', cuotas: '', fechasCuotas: [], nota: '' })
    setShowModal(true)
  }

  function cerrarModal() {
    setShowModal(false)
    setClienteSeleccionado(null)
    setPaso('cliente')
  }

  const RAMOS_FILTRO = ['Todos', ...catalogos.ramos]
  const filtradas = polizas.filter(p => {
    const q = search.toLowerCase()
    const nombre = p.clientes?.nombre || ''
    return (!q || nombre.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q) || p.ramo.toLowerCase().includes(q)) &&
           (filtroRamo === 'Todos' || p.ramo === filtroRamo)
  })

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    (c.direccion || '').toLowerCase().includes(clienteSearch.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>Pólizas</h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 3 }}>
            {loading ? 'Cargando...' : `${polizas.length} pólizas en cartera`}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirModal}>
          <Plus size={15} /> Nueva póliza
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
          <input placeholder="Buscar cliente o N° póliza..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: 280, background: 'white', color: 'var(--navy)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RAMOS_FILTRO.map(t => <button key={t} onClick={() => setFiltroRamo(t)} className={`filter-btn ${filtroRamo === t ? 'active' : ''}`}>{t}</button>)}
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <table>
          <colgroup>
            <col style={{ width: 130 }} /><col style={{ width: 200 }} /><col style={{ width: 130 }} />
            <col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 80 }} /><col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th>N° Póliza</th><th>Cliente</th><th>Ramo</th>
              <th>Compañía</th><th>Vencimiento</th><th>Moneda</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
                <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
                Cargando pólizas...
              </td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay pólizas cargadas</div>
                <div style={{ fontSize: 12 }}>Usá el botón "Nueva póliza" o agregá desde el módulo Clientes</div>
              </td></tr>
            ) : filtradas.map(p => {
              const { label, cls } = estadoBadge(p.vencimiento)
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{p.numero}</td>
                  <td style={{ fontWeight: 600 }}>{p.clientes?.nombre || '—'}</td>
                  <td><span className="badge badge-neutral">{p.ramo}</span></td>
                  <td style={{ color: 'var(--slate)', fontSize: 13 }}>{p.compania}</td>
                  <td style={{ fontSize: 13, color: 'var(--slate)' }}>{formatFecha(p.vencimiento)}</td>
                  <td style={{ fontSize: 12 }}>{p.moneda}</td>
                  <td><span className={`badge ${cls}`}>{label}</span></td>
                  <td>
                    {(p.doc_count ?? 0) > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--slate)', fontSize: 12 }}>
                        <Paperclip size={12} />
                        <span>{p.doc_count}</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Mobile card list */}
        <div className="mobile-list" style={{ display: 'none' }}>
          {filtradas.map(p => {
            const { label, cls } = estadoBadge(p.vencimiento)
            return (
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5FB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{p.clientes?.nombre || '—'}</div>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span className="badge badge-neutral">{p.ramo}</span>
                  <span style={{ fontSize: 12, color: 'var(--slate)', fontFamily: 'monospace', alignSelf: 'center' }}>{p.numero}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p.compania} · {p.moneda} · Vence {formatFecha(p.vencimiento)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MODAL NUEVA PÓLIZA (2 pasos) ─────────────────────────────────── */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="pago-modal" style={{ width: paso === 'cliente' ? 480 : 540 }} onClick={e => e.stopPropagation()}>

            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
                  {paso === 'cliente' ? 'Seleccionar cliente' : 'Nueva póliza'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                  Paso {paso === 'cliente' ? '1' : '2'} de 2 —{' '}
                  {paso === 'cliente' ? 'Elegí el cliente para esta póliza' : `Cliente: ${clienteSeleccionado?.nombre}`}
                </div>
              </div>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}><X size={18} /></button>
            </div>

            {/* Indicador de pasos */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {['Seleccionar cliente', 'Datos de la póliza'].map((label, i) => {
                const done = (i === 0 && paso === 'poliza')
                const active = (i === 0 && paso === 'cliente') || (i === 1 && paso === 'poliza')
                return (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: done || active ? 'var(--gold)' : 'var(--border)', transition: 'background .2s' }} />
                )
              })}
            </div>

            {/* ── PASO 1: Elegir cliente ── */}
            {paso === 'cliente' && (
              <>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)', pointerEvents: 'none' }} />
                  <input
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--navy)' }}
                  />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {clientesFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--slate)', fontSize: 13 }}>No se encontraron clientes</div>
                  ) : clientesFiltrados.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setClienteSeleccionado(c); setPaso('poliza') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                        borderRadius: 9, border: '1.5px solid var(--border)', cursor: 'pointer',
                        background: 'white', transition: 'all .12s'
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--gold-pale)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'white' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>
                        {c.nombre.trim()[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{c.nombre}</div>
                        {c.direccion && <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 1 }}>{c.direccion}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--slate)" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── PASO 2: Datos de la póliza ── */}
            {paso === 'poliza' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>

                  {/* Ramo */}
                  <div className="fgroup">
                    <label>Ramo *</label>
                    <select value={form.ramo} onChange={e => setForm({ ...form, ramo: e.target.value })}
                      style={{ color: form.ramo ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.ramos.map((r:string) => <option key={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* N° Póliza */}
                  <div className="fgroup">
                    <label>N° Póliza *</label>
                    <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                      placeholder="Ej: 4309338" autoFocus />
                  </div>

                  {/* Compañía */}
                  <div className="fgroup">
                    <label>Compañía *</label>
                    <select value={form.compania} onChange={e => setForm({ ...form, compania: e.target.value })}
                      style={{ color: form.compania ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.companias.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Corredor */}
                  <div className="fgroup">
                    <label>Corredor *</label>
                    <select value={form.corredor} onChange={e => setForm({ ...form, corredor: e.target.value })}
                      style={{ color: form.corredor ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {catalogos.corredores.map((c:string) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Vencimiento */}
                  <div className="fgroup">
                    <label>Vencimiento *</label>
                    <DatePicker value={form.vencimiento} onChange={v => setForm({ ...form, vencimiento: v })} placeholder="Seleccionar fecha" />
                  </div>

                  {/* Moneda */}
                  <div className="fgroup">
                    <label>Moneda *</label>
                    <select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}
                      style={{ color: form.moneda ? 'var(--navy)' : 'var(--slate)' }}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.monedas || []).map((m:string) => <option key={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Cantidad cuotas */}
                  <div className="fgroup">
                    <label>Cantidad de cuotas *</label>
                    <input type="number" min="1" max="36" value={form.cuotas}
                      onChange={e => setForm({ ...form, cuotas: e.target.value, fechasCuotas: [] })}
                      placeholder="Ej: 10" />
                  </div>

                  {/* Fechas por cuota */}
                  <div className="fgroup" style={{ gridColumn: 'span 2' }}>
                    <label>Fechas de vencimiento por cuota *
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--slate)', marginLeft: 6 }}>
                        — ingresá la cantidad de cuotas primero
                      </span>
                    </label>
                    <CuotasFechas cuotas={parseInt(form.cuotas) || 0} value={form.fechasCuotas} onChange={v => setForm({ ...form, fechasCuotas: v })} />
                  </div>

                </div>

                {/* Nota */}
                <div className="fgroup" style={{ marginTop: 4 }}>
                  <label>Nota <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--slate)' }}>(opcional)</span></label>
                  <textarea value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })}
                    placeholder="Descripción del bien asegurado"
                    rows={2}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--navy)', lineHeight: 1.5 }}
                    onFocus={e => (e.target.style.borderColor = 'var(--gold)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-outline" onClick={() => setPaso('cliente')}>← Cambiar cliente</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={cerrarModal}>Cancelar</button>
                    <button className="btn-primary" onClick={guardarPoliza} disabled={saving || !form.numero.trim()}>
                      {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar póliza'}
                    </button>
                  </div>
                </div>
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
echo '+ app/(app)/polizas/page.tsx'

echo '   git add .'
echo '   git commit -m "feat: whatsapp en clientes y vencimientos + docs en polizas"'
echo '   git push'
