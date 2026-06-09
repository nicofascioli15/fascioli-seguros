'use client'
import { useState } from 'react'
import { Search, Plus, X } from 'lucide-react'

// Tipos
type Cliente = {
  nombre: string
  direccion: string
  contacto: string
  tel: string
  email: string
}

// Datos iniciales de ejemplo
const CLIENTES_INICIALES: Cliente[] = [
  { nombre: 'Av Italia 7191', direccion: 'Av. Italia 7191, Montevideo', contacto: '', tel: '', email: '' },
  { nombre: 'Le Mans', direccion: '', contacto: '', tel: '', email: '' },
  { nombre: 'Sea Park', direccion: '', contacto: '', tel: '', email: '' },
  { nombre: 'El Ombú', direccion: '', contacto: '', tel: '', email: '' },
  { nombre: 'Rocamar', direccion: '', contacto: '', tel: '', email: '' },
  { nombre: 'Coop. José P Varela', direccion: 'José Pedro Varela, Montevideo', contacto: '', tel: '', email: '' },
  { nombre: 'Malena', direccion: '', contacto: '', tel: '', email: '' },
  { nombre: 'Tristan Narvaja', direccion: 'Tristán Narvaja, Montevideo', contacto: '', tel: '', email: '' },
]

type Props = { onSelect: (nombre: string) => void }

export default function ClientesList({ onSelect }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>(CLIENTES_INICIALES)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Cliente>({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.direccion.toLowerCase().includes(search.toLowerCase())
  )

  function guardar() {
    if (!form.nombre.trim()) return
    setClientes(prev => [form, ...prev])
    setForm({ nombre: '', direccion: '', contacto: '', tel: '', email: '' })
    setShowModal(false)
  }

  function eliminar(nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    setClientes(prev => prev.filter(c => c.nombre !== nombre))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>{clientes.length} clientes registrados</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={14} className="search-icon" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)' }} />
          <input
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 340 }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtrados.map(c => {
          const initial = c.nombre.trim()[0]?.toUpperCase() || '?'
          return (
            <div key={c.nombre} className="edif-card" onClick={() => onSelect(c.nombre)}>
              <div className="edif-avatar">{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="edif-name">{c.nombre}</div>
                <div className="edif-addr">{c.direccion || 'Sin dirección registrada'}</div>
              </div>
              <button
                className="edif-del-btn"
                onClick={e => { e.stopPropagation(); eliminar(c.nombre) }}
                title="Eliminar cliente"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
        {!filtrados.length && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'var(--slate)' }}>
            No se encontraron clientes
          </div>
        )}
      </div>

      {/* Modal nuevo cliente */}
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
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del edificio o cliente" />
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
              <button className="btn-primary" onClick={guardar}>Guardar cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
