'use client'
import { useState } from 'react'
import { ShieldCheck, FileCheck2, AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import DatePicker from '@/components/DatePicker'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatFecha, hoyLocal, PLAZO_CIERRE_BPS_DIAS, TIPOS_OBRA, textoGarantia, type CierreBps } from '@/lib/obrasConfig'
import type { ObraCompleta } from '@/lib/obrasData'

// Garantía post-obra + cierre de obra ante BPS (lo que antes era el formulario F9).
export default function ObraCierre({ obra, onChange, onPedirDocumento }: { obra: ObraCompleta; onChange: () => void; onPedirDocumento: () => void }) {
  const supabase = createClient()
  const { cierre, garantia } = obra
  const [accion, setAccion] = useState<null | 'fin' | CierreBps>(null)
  const [fecha, setFecha] = useState(hoyLocal())
  const [saving, setSaving] = useState(false)

  async function aplicar() {
    if (!accion) return
    setSaving(true)
    const cambios: any = accion === 'fin'
      ? { fecha_fin_real: fecha, estado: 'Finalizada', avance: 100 }
      // Al aprobar se conserva la fecha de presentación si ya estaba cargada.
      : { cierre_bps_estado: accion, cierre_bps_fecha: accion === 'Presentado' ? fecha : accion === 'Aprobado' ? (obra.cierre_bps_fecha || fecha) : obra.cierre_bps_fecha }
    const antes: any = accion === 'fin'
      ? { fecha_fin_real: obra.fecha_fin_real, estado: obra.estado, avance: obra.avance }
      : { cierre_bps_estado: obra.cierre_bps_estado, cierre_bps_fecha: obra.cierre_bps_fecha }
    const { error } = await supabase.from('obras').update(cambios).eq('id', obra.id)
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    await registrarAudit({ accion: 'editar', tabla: 'obras', registroId: obra.id, descripcion: accion === 'fin' ? `Obra terminada el ${formatFecha(fecha)} — ${obra.titulo} (${obra.edificio})` : `Cierre BPS: ${accion} — ${obra.titulo} (${obra.edificio})`, datosAntes: antes, datosDespues: cambios })
    setAccion(null)
    onChange()
  }

  const responsableTxt = cierre.responsable === 'empresa'
    ? 'La obra está a nombre de la empresa: el cierre lo tiene que hacer ella. Pedile la constancia y subila acá.'
    : 'La obra está a nombre del edificio: el cierre lo gestiona la administración (servicio en línea de BPS con usuario personal del titular o representante).'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
      {/* CIERRE BPS */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${cierre.vencido ? '#FCA5A5' : 'var(--border-soft)'}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FileCheck2 size={18} color="var(--gold)" />
          <div style={{ fontWeight: 800, fontSize: 15 }}>Cierre de obra en BPS</div>
          <span className={`badge ${obra.cierre_bps_estado === 'Aprobado' ? 'badge-success' : obra.cierre_bps_estado === 'Presentado' ? 'badge-gold' : obra.cierre_bps_estado === 'No aplica' ? 'badge-neutral' : cierre.vencido ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: 'auto' }}>{obra.cierre_bps_estado}</span>
        </div>

        {!cierre.aplica ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Marcado como "No aplica" para esta obra.</div>
        ) : !obra.fecha_fin_real ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
              Cuando la obra termine, hay <strong>{PLAZO_CIERRE_BPS_DIAS} días corridos</strong> para comunicar el fin de obra en BPS. Cargá la fecha de terminación y el sistema te avisa el plazo.
            </div>
            <button className="btn-primary btn-sm" onClick={() => { setFecha(hoyLocal()); setAccion('fin') }}><CheckCircle2 size={13} /> Marcar obra terminada</button>
          </>
        ) : (
          <>
            <Linea icon={<CheckCircle2 size={14} color="#2E9668" />} texto={`Obra terminada el ${formatFecha(obra.fecha_fin_real)}`} />
            <Linea icon={<Clock size={14} color={cierre.vencido ? 'var(--danger)' : 'var(--text-muted)'} />}
              texto={cierre.pendiente
                ? (cierre.vencido ? `Plazo vencido hace ${Math.abs(cierre.dias!)} días (era el ${formatFecha(cierre.limite)})` : `Plazo para el cierre: ${formatFecha(cierre.limite)} (${cierre.dias} días)`)
                : `Plazo era el ${formatFecha(cierre.limite)}`}
              color={cierre.vencido ? 'var(--danger)' : undefined} />
            {obra.cierre_bps_fecha && <Linea icon={<FileCheck2 size={14} color="var(--gold)" />} texto={`${obra.cierre_bps_estado === 'Aprobado' ? 'Aprobado' : 'Presentado'} el ${formatFecha(obra.cierre_bps_fecha)}`} />}
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '10px 0 12px', background: 'var(--bg-card-alt)', padding: '9px 11px', borderRadius: 8 }}>{responsableTxt}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {obra.cierre_bps_estado === 'Pendiente' && <button className="btn-primary btn-sm" onClick={() => { setFecha(hoyLocal()); setAccion('Presentado') }}>Marcar presentado</button>}
              {obra.cierre_bps_estado !== 'Aprobado' && obra.cierre_bps_estado !== 'No aplica' && <button className="btn-outline btn-sm" onClick={() => { setFecha(hoyLocal()); setAccion('Aprobado') }}>Marcar aprobado</button>}
              <button className="btn-outline btn-sm" onClick={onPedirDocumento}>Subir constancia</button>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.45 }}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Es el último paso de la obra ante BPS (antes era el formulario F9 "Cambio de estado de obra"; hoy es en línea, y el F9 queda para obras de más de 5 años). Una obra sin cerrar puede generar deudas y trabar certificados cuando se vendan unidades del edificio.</span>
        </div>
      </div>

      {/* GARANTÍA */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${garantia.porVencer ? '#FCD34D' : 'var(--border-soft)'}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <ShieldCheck size={18} color="#2E9668" />
          <div style={{ fontWeight: 800, fontSize: 15 }}>Garantía</div>
          <span className={`badge ${garantia.estado === 'en_garantia' ? (garantia.porVencer ? 'badge-warning' : 'badge-success') : 'badge-neutral'}`} style={{ marginLeft: 'auto' }}>
            {garantia.estado === 'sin_fin' ? 'Sin fecha' : garantia.estado === 'vencida' ? 'Vencida' : garantia.porVencer ? 'Por vencer' : 'Vigente'}
          </span>
        </div>
        <Linea icon={<ShieldCheck size={14} color="var(--text-muted)" />} texto={`${textoGarantia(obra.garantia_meses, obra.garantia_unidad)} desde ${obra.fecha_contrato ? `la firma del contrato (${formatFecha(obra.fecha_contrato)})` : 'el fin de la obra (falta cargar la fecha de firma)'}`} />
        {garantia.hasta && (
          <Linea icon={<Clock size={14} color={garantia.porVencer ? '#D97706' : 'var(--text-muted)'} />}
            texto={garantia.estado === 'vencida' ? `Venció el ${formatFecha(garantia.hasta)}` : `Cubre hasta el ${formatFecha(garantia.hasta)} (${garantia.dias} días)`}
            color={garantia.porVencer ? '#B45309' : undefined} />
        )}
        {garantia.porVencer && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '9px 11px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', fontSize: 12.5, lineHeight: 1.45 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Recorré la obra con el edificio y reclamá a la empresa cualquier defecto antes de que venza la garantía.</span>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-main)' }}>Régimen:</strong> {TIPOS_OBRA.find(t => t.value === obra.tipo_obra)?.label} · inscripta a nombre {obra.titular_bps === 'empresa' || obra.tipo_obra === 'menor_cuantia' ? 'de la empresa' : 'del edificio'}
          {obra.nro_obra_bps && <> · N° BPS {obra.nro_obra_bps}</>}
          {obra.fecha_inscripcion_bps && <> · inscripta el {formatFecha(obra.fecha_inscripcion_bps)}</>}
        </div>
      </div>

      <ConfirmDialog
        open={!!accion}
        tone="neutral"
        title={accion === 'fin' ? 'Marcar la obra como terminada' : accion === 'Presentado' ? 'Cierre presentado en BPS' : 'Cierre aprobado por BPS'}
        confirmLabel="Guardar"
        loading={saving}
        message={
          <div style={{ textAlign: 'left' }}>
            <div className="fgroup" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>{accion === 'fin' ? 'Fecha de terminación / recepción' : accion === 'Aprobado' && obra.cierre_bps_fecha ? 'Fecha (se conserva la de presentación ya cargada)' : 'Fecha de presentación'}</label>
              <DatePicker value={fecha} onChange={setFecha} />
            </div>
            {accion === 'fin' && <div style={{ fontSize: 12, marginTop: 8 }}>Desde esa fecha corren los {PLAZO_CIERRE_BPS_DIAS} días para el cierre en BPS.</div>}
          </div>
        }
        onConfirm={aplicar}
        onCancel={() => setAccion(null)}
      />
    </div>
  )
}

function Linea({ icon, texto, color }: { icon: React.ReactNode; texto: string; color?: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: color || 'var(--text-main)', marginBottom: 6 }}>{icon}{texto}</div>
}
