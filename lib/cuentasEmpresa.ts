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

// Texto que se copia al portapapeles (uno por línea), para pegar en el home banking o en un mensaje.
export function textoCuenta(c: { banco?: string | null; moneda?: string | null; nro_cuenta?: string | null; titular?: string | null }, empresa?: string | null): string {
  return [
    c.banco && `Banco: ${c.banco}`,
    c.moneda && `Moneda: ${monedaTexto(c.moneda)}`,
    `Cuenta: ${c.nro_cuenta || ''}`,
    (c.titular || empresa) && `Titular: ${c.titular || empresa}`,
  ].filter(Boolean).join('\n')
}

// Número de WhatsApp de Uruguay a partir de lo que esté cargado (099 123 456 → 59899123456).
export function numeroWhatsapp(tel: string): string {
  const n = tel.replace(/\D/g, '')
  return n.startsWith('598') ? n : `598${n.replace(/^0+/, '')}`
}
