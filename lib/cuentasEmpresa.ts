// Cuentas bancarias de las empresas de obras (una empresa puede tener varias: pesos, dólares, etc.).
export type CuentaEmpresa = { banco: string; moneda: string; nro_cuenta: string; titular: string }

export const MONEDAS_CUENTA = [
  { value: '$', label: 'Pesos ($)' },
  { value: 'U$S', label: 'Dólares (U$S)' },
]

export const cuentaVacia = (): CuentaEmpresa => ({ banco: '', moneda: '$', nro_cuenta: '', titular: '' })

export function monedaTexto(m: string): string {
  return m === 'U$S' ? 'Dólares' : m === '$' ? 'Pesos' : m
}

// Lee las cuentas de una empresa. Si todavía no tiene la lista nueva, usa la cuenta única de antes.
export function cuentasDe(e: any): CuentaEmpresa[] {
  if (!e) return []
  const lista = Array.isArray(e.cuentas) ? e.cuentas : []
  if (lista.length) return lista.map((c: any) => ({ banco: c.banco || '', moneda: c.moneda || '$', nro_cuenta: c.nro_cuenta || '', titular: c.titular || '' }))
  if (e.banco || e.nro_cuenta) return [{ banco: e.banco || '', moneda: '$', nro_cuenta: e.nro_cuenta || '', titular: e.titular_cuenta || '' }]
  return []
}

// Deja solo las cuentas con algún dato y sin espacios de más, para guardar.
export function limpiarCuentas(cs: CuentaEmpresa[]): CuentaEmpresa[] {
  return cs
    .map(c => ({ banco: c.banco.trim(), moneda: c.moneda || '$', nro_cuenta: c.nro_cuenta.trim(), titular: c.titular.trim() }))
    .filter(c => c.banco || c.nro_cuenta)
}

// Lo que se guarda en la base: la lista nueva y, para compatibilidad, la primera cuenta en los campos viejos.
export function payloadCuentas(cs: CuentaEmpresa[]) {
  const limpias = limpiarCuentas(cs)
  const p = limpias[0]
  return { cuentas: limpias, banco: p?.banco || null, nro_cuenta: p?.nro_cuenta || null, titular_cuenta: p?.titular || null }
}
