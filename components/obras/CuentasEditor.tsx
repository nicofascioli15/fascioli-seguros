'use client'
import { Plus, Trash2 } from 'lucide-react'
import { BANCOS_UY } from '@/lib/obrasConfig'
import { MONEDAS_CUENTA, cuentaVacia, type CuentaEmpresa } from '@/lib/cuentasEmpresa'

// Lista editable de cuentas bancarias: un renglón por cuenta y "+ Agregar cuenta".
export default function CuentasEditor({ cuentas, onChange, compacto }: { cuentas: CuentaEmpresa[]; onChange: (c: CuentaEmpresa[]) => void; compacto?: boolean }) {
  const set = (i: number, cambios: Partial<CuentaEmpresa>) => onChange(cuentas.map((c, j) => (j === i ? { ...c, ...cambios } : c)))
  const quitar = (i: number) => onChange(cuentas.filter((_, j) => j !== i))
  const st: React.CSSProperties = { width: '100%', padding: compacto ? '8px 10px' : '9px 11px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', color: 'var(--navy)', background: 'var(--bg-card)', boxSizing: 'border-box', minWidth: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {cuentas.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sin cuentas cargadas.</div>}
      {cuentas.map((c, i) => (
        <div key={i} style={{ border: '1px solid var(--border-soft)', borderRadius: 10, padding: 10, background: 'var(--bg-card-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Cuenta {i + 1}</span>
            <button type="button" onClick={() => quitar(i)} title="Quitar cuenta" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}><Trash2 size={13} /></button>
          </div>
          <div className="cuenta-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.6fr', gap: 8 }}>
            <select style={{ ...st, color: c.banco ? 'var(--navy)' : 'var(--slate)' }} value={c.banco} onChange={e => set(i, { banco: e.target.value })}>
              <option value="">Banco</option>
              {BANCOS_UY.map(b => <option key={b} value={b}>{b}</option>)}
              {c.banco && !BANCOS_UY.includes(c.banco) && <option value={c.banco}>{c.banco}</option>}
            </select>
            <select style={st} value={c.moneda} onChange={e => set(i, { moneda: e.target.value })}>
              {MONEDAS_CUENTA.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input style={st} value={c.nro_cuenta} onChange={e => set(i, { nro_cuenta: e.target.value })} placeholder="N° de cuenta" />
            <input style={{ ...st, gridColumn: '1 / -1' }} value={c.titular} onChange={e => set(i, { titular: e.target.value })} placeholder="Titular (si es distinto a la empresa)" />
          </div>
        </div>
      ))}
      <button type="button" className="btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...cuentas, cuentaVacia()])}>
        <Plus size={13} /> {cuentas.length ? 'Agregar otra cuenta' : 'Agregar cuenta'}
      </button>
      <style>{`@media (max-width: 560px) { .cuenta-grid { grid-template-columns: 1fr 1fr !important; } .cuenta-grid > input:first-of-type { grid-column: 1 / -1; } }`}</style>
    </div>
  )
}
