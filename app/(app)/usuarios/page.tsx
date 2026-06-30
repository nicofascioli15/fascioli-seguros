'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Loader2, Shield, User, Plus, X, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useRouter } from 'next/navigation'

type Usuario = {
  id: string; email: string; nombre: string | null
  rol: 'admin' | 'superadmin'; activo: boolean; created_at: string
}

export default function UsuariosPage() {
  const supabase = createClient()
  const { esSuperAdmin, loading: loadingRol } = useAuth()
  const router = useRouter()

  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState<string | null>(null)
  const [form, setForm]             = useState({ email: '', nombre: '', rol: 'admin' as 'admin' | 'superadmin', password: '' })

  // Password change
  const [showPassModal, setShowPassModal] = useState<Usuario | null>(null)
  const [newPassword, setNewPassword]     = useState('')
  const [savingPass, setSavingPass]       = useState(false)

  useEffect(() => {
    if (!loadingRol && !esSuperAdmin) router.push('/dashboard')
  }, [loadingRol, esSuperAdmin])

  useEffect(() => { fetchUsuarios() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function fetchUsuarios() {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('created_at')
    if (data) setUsuarios(data)
    setLoading(false)
  }

  async function crearUsuario() {
    if (!form.email || !form.password) return
    setSaving(true)
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (authErr || !authData.user) {
      showToast('Error: ' + (authErr?.message || 'No se pudo crear'))
      setSaving(false)
      return
    }
    await supabase.from('usuarios').insert([{ id: authData.user.id, email: form.email, nombre: form.nombre || null, rol: form.rol }])
    setShowModal(false)
    setForm({ email: '', nombre: '', rol: 'admin', password: '' })
    showToast(`Usuario ${form.email} creado`)
    await fetchUsuarios()
    setSaving(false)
  }

  async function cambiarPassword() {
    if (!showPassModal || newPassword.length < 6) return
    setSavingPass(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: showPassModal.id, password: newPassword }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast(`Contraseña actualizada para ${showPassModal.nombre || showPassModal.email}`)
        setShowPassModal(null)
        setNewPassword('')
      } else {
        showToast('Error: ' + (data.error || 'No se pudo cambiar'))
      }
    } catch {
      showToast('Error al conectar con el servidor')
    }
    setSavingPass(false)
  }

  async function cambiarRol(u: Usuario, nuevoRol: 'admin' | 'superadmin') {
    await supabase.from('usuarios').update({ rol: nuevoRol }).eq('id', u.id)
    showToast(`Rol actualizado a ${nuevoRol}`)
    await fetchUsuarios()
  }

  async function toggleActivo(u: Usuario) {
    await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    showToast(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    await fetchUsuarios()
  }

  if (loadingRol) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Usuarios</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Gestión de accesos al sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Nuevo usuario</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total usuarios',        value: usuarios.length,                                    bg: '#EEF2F8', color: 'var(--text-main)' },
          { label: 'Super Admin',           value: usuarios.filter(u => u.rol === 'superadmin').length, bg: 'var(--gold-pale,#FEF3C7)', color: '#7A5800' },
          { label: 'Activos',               value: usuarios.filter(u => u.activo).length,              bg: '#E6F5EF', color: '#1A7A4E' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: s.color, opacity: .7, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : usuarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay usuarios registrados</div>
        </div>
      ) : usuarios.map(u => (
        <div key={u.id} style={{
          background: 'var(--bg-card)', borderRadius: 12, marginBottom: 8,
          border: `1px solid ${u.rol === 'superadmin' ? 'rgba(201,168,76,.3)' : 'var(--border)'}`,
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          opacity: u.activo ? 1 : 0.5
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: u.rol === 'superadmin' ? 'var(--navy)' : '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {u.rol === 'superadmin' ? <Shield size={20} color="var(--gold)" /> : <User size={20} color="var(--slate)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{u.nombre || u.email}</div>
            {u.nombre && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{u.email}</div>}
            <div style={{ marginTop: 4 }}>
              <span className={`badge ${u.rol === 'superadmin' ? 'badge-gold' : 'badge-neutral'}`}>
                {u.rol === 'superadmin' ? 'Super Admin' : 'Admin'}
              </span>
              {!u.activo && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Inactivo</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <select value={u.rol} onChange={e => cambiarRol(u, e.target.value as any)}
              style={{ height: 36, padding: '0 10px', border: '1.5px solid var(--border-soft)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)', minWidth: 120 }}>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <button className="btn-outline btn-sm" title="Cambiar contraseña"
              style={{ height: 36, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => { setShowPassModal(u); setNewPassword('') }}>
              <KeyRound size={13} /> Contraseña
            </button>
            <button className={u.activo ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
              style={{ fontSize: 12, height: 36, whiteSpace: 'nowrap' }}
              onClick={() => toggleActivo(u)}>
              {u.activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      ))}

      {/* Modal nuevo usuario */}
      {showModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="pago-modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Nuevo usuario</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="fgroup"><label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@fascioli.com.uy" autoFocus /></div>
            <div className="fgroup"><label>Nombre</label>
              <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre completo" /></div>
            <div className="fgroup"><label>Contraseña inicial *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Mínimo 6 caracteres" /></div>
            <div className="fgroup"><label>Rol</label>
              <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value as any})}>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearUsuario} disabled={saving || !form.email || !form.password}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creando...</> : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {showPassModal && (
        <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget) { setShowPassModal(null); setNewPassword('') } }}>
          <div className="pago-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={16} color="var(--gold)" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Cambiar contraseña</h3>
              </div>
              <button onClick={() => { setShowPassModal(null); setNewPassword('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-card-alt)', borderRadius: 8, borderLeft: '3px solid var(--gold)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{showPassModal.nombre || showPassModal.email}</div>
              {showPassModal.nombre && <div style={{ fontSize: 11, marginTop: 2 }}>{showPassModal.email}</div>}
            </div>
            <div className="fgroup">
              <label>Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" autoFocus
                onKeyDown={e => e.key === 'Enter' && newPassword.length >= 6 && cambiarPassword()} />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Mínimo 6 caracteres</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => { setShowPassModal(null); setNewPassword('') }}>Cancelar</button>
              <button className="btn-primary" onClick={cambiarPassword} disabled={savingPass || newPassword.length < 6}>
                {savingPass ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cambiando...</> : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 300, background: 'var(--navy)', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)', borderLeft: '3px solid var(--gold)' }}>{toast}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

