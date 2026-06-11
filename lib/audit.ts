import { createClient } from '@/lib/supabase'

type Accion = 'crear' | 'editar' | 'eliminar'
type Tabla  = 'clientes' | 'polizas' | 'pagos' | 'siniestros' | 'documentos'

export async function registrarAudit({
  accion,
  tabla,
  registroId,
  descripcion,
  datosAntes,
  datosDespues,
}: {
  accion:       Accion
  tabla:        Tabla
  registroId?:  string
  descripcion:  string
  datosAntes?:  object | null
  datosDespues?: object | null
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_log').insert([{
      usuario_id:    user.id,
      usuario_email: user.email,
      accion,
      tabla,
      registro_id:   registroId || null,
      descripcion,
      datos_antes:   datosAntes   || null,
      datos_despues: datosDespues || null,
    }])
  } catch (e) {
    // Audit failures should never block the main operation
    console.warn('Audit log failed:', e)
  }
}

