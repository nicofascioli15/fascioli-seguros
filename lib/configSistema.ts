import { createClient } from './supabase'

export async function getConfig(clave: string, fallback: string = ''): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.from('configuracion_sistema').select('valor').eq('clave', clave).single()
  return data?.valor || fallback
}

export async function setConfig(clave: string, valor: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('configuracion_sistema').upsert({ clave, valor, updated_at: new Date().toISOString() }, { onConflict: 'clave' })
}

