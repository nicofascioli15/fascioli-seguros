'use client'
import { useRef, useState } from 'react'
import { X, Upload, Loader2, CheckCircle2, AlertTriangle, FileText, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { traerTodo } from '@/lib/traerTodo'
import { leerArchivo, parseEdificios, parseTorres, parseUnidades, type EdificioArchivo, type TorreArchivo, type UnidadArchivo } from '@/lib/padronImport'

type Existente = { id: string; nombre: string; direccion: string | null; codigo: string | null }
type Archivo = 'edificios' | 'torres' | 'unidades'

const INFO: Record<Archivo, { titulo: string; ejemplo: string }> = {
  edificios: { titulo: 'Edificios', ejemplo: 'A01;EDIFICIO RETAMOSA;RETAMOSA 1773' },
  torres: { titulo: 'Torres / sectores', ejemplo: 'A34;A;APARTAMENTOS' },
  unidades: { titulo: 'Unidades (aptos)', ejemplo: 'A01;;101;P;Juan Pérez;099123456;mail@...' },
}

// "EDIFICIO AV. ITALIA 7191" → "Edificio Av. Italia 7191"
function prolijo(s: string): string {
  return s.toLowerCase().replace(/(^|[\s(./-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(De|Del|La|Las|Los|Y|E)\b/g, m => m.toLowerCase()).replace(/^./, c => c.toUpperCase())
}

// Importa los archivos del sistema de gastos comunes a los edificios PROPIOS de Asambleas
// (no toca los edificios de Seguros, Mantenimiento, Obras ni Contratos).
// Se engancha todo por el código del edificio (A01...). No borra nada: crea lo nuevo y actualiza lo existente.
export default function ImportarPadron({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const supabase = createClient()
  const [archivos, setArchivos] = useState<Partial<Record<Archivo, File>>>({})
  const [analisis, setAnalisis] = useState<null | {
    edifs: EdificioArchivo[]; nuevos: number; torres: TorreArchivo[]; unidades: UnidadArchivo[]; sinEdificio: string[]
  }>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)

  async function analizar() {
    if (!archivos.edificios && !archivos.torres && !archivos.unidades) { showToast('Elegí al menos un archivo', 'error'); return }
    setTrabajando('Leyendo archivos...')
    try {
      const [te, tt, tu] = await Promise.all([archivos.edificios, archivos.torres, archivos.unidades].map(f => f ? leerArchivo(f) : Promise.resolve('')))
      const edifs = te ? parseEdificios(te) : []
      const torres = tt ? parseTorres(tt) : []
      const unidades = tu ? parseUnidades(tu) : []
      const existentes = await traerTodo<Existente>(() => supabase.from('asam_edificios').select('id, nombre, direccion, codigo').order('id'))
      const cods = new Set(existentes.map(e => (e.codigo || '').toUpperCase()))
      const conocidos = new Set([...cods, ...edifs.map(e => e.codigo)])
      const sinEdificio = Array.from(new Set([...torres.map(t => t.edificio), ...unidades.map(u => u.edificio)])).filter(c => !conocidos.has(c)).sort()
      setAnalisis({ edifs, nuevos: edifs.filter(e => !cods.has(e.codigo)).length, torres, unidades, sinEdificio })
    } catch (e: any) {
      showToast(`No se pudieron leer los archivos: ${e?.message || e}`, 'error')
    }
    setTrabajando(null)
  }

  async function importar() {
    if (!analisis) return
    const { edifs, torres, unidades } = analisis
    try {
      if (edifs.length) {
        setTrabajando('Cargando edificios...')
        const filas = edifs.map(e => ({ codigo: e.codigo, nombre: prolijo(e.nombre), direccion: e.direccion ? prolijo(e.direccion) : null }))
        for (let i = 0; i < filas.length; i += 200) {
          const { error } = await supabase.from('asam_edificios').upsert(filas.slice(i, i + 200), { onConflict: 'codigo' })
          if (error) throw new Error(`Edificios: ${error.message}`)
        }
      }
      const todos = await traerTodo<Existente>(() => supabase.from('asam_edificios').select('id, nombre, direccion, codigo').order('id'))
      const idDe = new Map(todos.filter(e => e.codigo).map(e => [e.codigo!.toUpperCase(), e.id]))

      const filasT = torres.filter(t => idDe.has(t.edificio)).map(t => ({ edificio_id: idDe.get(t.edificio)!, codigo: t.codigo, nombre: prolijo(t.nombre) }))
      if (filasT.length) {
        setTrabajando('Cargando torres...')
        const { error } = await supabase.from('asam_torres').upsert(filasT, { onConflict: 'edificio_id,codigo' })
        if (error) throw new Error(`Torres: ${error.message}`)
      }

      // Unidades: no toca el coeficiente que ya esté cargado
      const filasU = unidades.filter(u => idDe.has(u.edificio)).map(u => ({
        edificio_id: idDe.get(u.edificio)!, torre: u.torre, unidad: u.unidad,
      }))
      for (let i = 0; i < filasU.length; i += 500) {
        setTrabajando(`Cargando unidades... ${Math.min(i + 500, filasU.length)} de ${filasU.length}`)
        const { error } = await supabase.from('asam_unidades').upsert(filasU.slice(i, i + 500), { onConflict: 'edificio_id,torre,unidad' })
        if (error) throw new Error(`Unidades: ${error.message}`)
      }
      const resumen = [edifs.length && `${edifs.length} edificios (${analisis.nuevos} nuevos)`, filasT.length && `${filasT.length} torres`, filasU.length && `${filasU.length} unidades`].filter(Boolean).join(' · ') || 'Sin cambios'
      await registrarAudit({ accion: 'crear', tabla: 'asam_unidades', descripcion: `Importación de padrón de Asambleas: ${resumen}` })
      setHecho(resumen)
      onDone()
    } catch (e: any) {
      showToast(`Se cortó la importación: ${e?.message || e}. Lo que ya se cargó queda guardado; podés volver a importar.`, 'error')
    }
    setTrabajando(null)
  }

  const nEdifConUnidades = analisis ? new Set(analisis.unidades.map(u => u.edificio)).size : 0

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !trabajando) onClose() }}>
      <div className="pago-modal" style={{ width: 640, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Importar edificios, torres y aptos</h3>
          <button onClick={onClose} disabled={!!trabajando} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Los archivos que exporta el sistema de gastos comunes (separados por punto y coma). Podés subir uno solo o los tres.
          Son solo para Asambleas: no tocan los edificios de Seguros, Mantenimiento, Obras ni Contratos. No se borra nada y el coeficiente cargado a mano se mantiene.
          De los aptos se toman solo los números de unidad (no los nombres: se registran en la asamblea).
        </div>

        {hecho ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <CheckCircle2 size={44} color="#16A34A" />
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>Importación terminada</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{hecho}</div>
            <button className="btn-primary" style={{ marginTop: 18 }} onClick={onClose}>Listo</button>
          </div>
        ) : !analisis ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(Object.keys(INFO) as Archivo[]).map(k => (
                <SelectorArchivo key={k} titulo={INFO[k].titulo} ejemplo={INFO[k].ejemplo} archivo={archivos[k]} onFile={f => setArchivos(a => ({ ...a, [k]: f }))} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn-primary" onClick={analizar} disabled={!!trabajando}>{trabajando ? <><Loader2 size={14} className="spin" /> {trabajando}</> : 'Revisar antes de importar'}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 14 }}>
              <Mini label="Edificios" valor={analisis.edifs.length} sub={analisis.edifs.length ? `${analisis.nuevos} nuevos` : undefined} />
              <Mini label="Torres" valor={analisis.torres.length} />
              <Mini label="Unidades" valor={analisis.unidades.length} sub={nEdifConUnidades ? `de ${nEdifConUnidades} edificios` : undefined} />
            </div>
            {analisis.sinEdificio.length > 0 && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#92400E', background: '#FEF3C7', borderRadius: 8, padding: '9px 11px', marginBottom: 14 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>Estos códigos tienen torres o aptos pero el edificio no está cargado: <strong>{analisis.sinEdificio.join(', ')}</strong>. Se saltean; subí también el archivo de edificios para incluirlos.</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => setAnalisis(null)} disabled={!!trabajando}>← Cambiar archivos</button>
              <button className="btn-primary" onClick={importar} disabled={!!trabajando}>
                {trabajando ? <><Loader2 size={14} className="spin" /> {trabajando}</> : <><Upload size={14} /> Importar</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SelectorArchivo({ titulo, ejemplo, archivo, onFile }: { titulo: string; ejemplo: string; archivo?: File; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div onClick={() => ref.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: `1.5px dashed ${archivo ? 'var(--gold)' : 'var(--border)'}`, background: archivo ? 'var(--gold-pale)' : 'var(--bg-card-alt)' }}>
      {archivo ? <CheckCircle2 size={20} color="var(--gold)" /> : <FileText size={20} color="var(--text-muted)" />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{titulo}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivo ? archivo.name : `Ej: ${ejemplo}`}</div>
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gold)' }}>{archivo ? 'Cambiar' : 'Elegir archivo'}</span>
      <input ref={ref} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </div>
  )
}

function Mini({ label, valor, sub }: { label: string; valor: number; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-card-alt)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} color="var(--gold)" />{valor}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}
