#!/bin/bash
set -e
cat > app/clientes/ClientesList.tsx << 'FILEEOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react'
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
          <button className="btn-outline" onClick={() => csvRef.current?.click()}>
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
                {c.contacto && <div style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 2 }}>👤 {c.contacto}</div>}
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
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
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
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>👤 Nuevo cliente</h3>
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

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

FILEEOF
echo '✅ Listo'
echo '   git add .'
echo '   git commit -m "feat: plantilla CSV descargable para importar clientes"'
echo '   git push'
