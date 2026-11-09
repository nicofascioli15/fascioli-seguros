'use client'
import { useRef, useState } from 'react'
import { X, Upload, Loader2, CheckCircle2, AlertTriangle, FileText, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { registrarAudit } from '@/lib/audit'
import { showToast } from '@/lib/toast'
import { traerTodo } from '@/lib/traerTodo'
import { leerArchivo, parseEdificios, parseTorres, parseUnidades, normalizarNombre, type EdificioArchivo, type TorreArchivo, type UnidadArchivo } from '@/lib/padronImport'

type Existente = { id: string; nombre: string; direccion: string | null; codigo: string | null }
type Match = { fila: EdificioArchivo; destino: string; como: 'codigo' | 'nombre' | 'nuevo' }   // destino = id existente o 'nuevo'
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

// Importa los archivos del sistema de gastos comunes. Se puede subir uno solo (ej. solo los aptos
// de un edificio nuevo) o los tres juntos. No borra nada: crea lo nuevo y actualiza lo que ya está.
export default function ImportarPadron({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const supabase = createClient()
  const [archivos, setArchivos] = useState<Partial<Record<Archivo, File>>>({})
  const [analisis, setAnalisis] = useState<null | {
    existentes: Existente[]; matches: Match[]; torres: TorreArchivo[]; unidades: UnidadArchivo[]
    sinEdificio: string[]
  }>(null)
  const [nombresProlijos, setNombresProlijos] = useState(true)
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
      const existentes = await traerTodo<Existente>(() => supabase.from('mant_clientes').select('id, nombre, direccion, codigo').order('id'))
      const porCodigo = new Map(existentes.filter(e => e.codigo).map(e => [e.codigo!.toUpperCase(), e]))
      const porNombre = new Map<string, Existente>()
      existentes.forEach(e => { const k = normalizarNombre(e.nombre); if (k && !porNombre.has(k)) porNombre.set(k, e) })
      const usados = new Set<string>()
      const matches: Match[] = edifs.map(fila => {
        const c = porCodigo.get(fila.codigo)
        if (c) { usados.add(c.id); return { fila, destino: c.id, como: 'codigo' } }
        const n = porNombre.get(normalizarNombre(fila.nombre))
        if (n && !n.codigo && !usados.has(n.id)) { usados.add(n.id); return { fila, destino: n.id, como: 'nombre' } }
        return { fila, destino: 'nuevo', como: 'nuevo' }
      })
      // Códigos que aparecen en torres/unidades y no están ni en el sistema ni en el archivo de edificios
      const conocidos = new Set([...porCodigo.keys(), ...edifs.map(e => e.codigo)])
      const sinEdificio = Array.from(new Set([...torres.map(t => t.edificio), ...unidades.map(u => u.edificio)])).filter(c => !conocidos.has(c)).sort()
      setAnalisis({ existentes, matches, torres, unidades, sinEdificio })
    } catch (e: any) {
      showToast(`No se pudieron leer los archivos: ${e?.message || e}`, 'error')
    }
    setTrabajando(null)
  }

  async function importar() {
    if (!analisis) return
    const { matches, torres, unidades } = analisis
    let creados = 0, vinculados = 0, nTorres = 0, nUnidades = 0
    try {
      // 1) Edificios
      if (matches.length) {
        setTrabajando('Cargando edificios...')
        const nuevos = matches.filter(m => m.destino === 'nuevo').map(m => ({ codigo: m.fila.codigo, nombre: nombresProlijos ? prolijo(m.fila.nombre) : m.fila.nombre, direccion: m.fila.direccion ? (nombresProlijos ? prolijo(m.fila.direccion) : m.fila.direccion) : null }))
        for (let i = 0; i < nuevos.length; i += 200) {
          const { error } = await supabase.from('mant_clientes').insert(nuevos.slice(i, i + 200))
          if (error) throw new Error(`Edificios: ${error.message}`)
        }
        creados = nuevos.length
        // A los que ya existían se les pone el código (y la dirección si no tenían)
        const vincular = matches.filter(m => m.destino !== 'nuevo')
        for (const m of vincular) {
          const ex = analisis.existentes.find(e => e.id === m.destino)
          const cambios: any = { codigo: m.fila.codigo }
          if (!ex?.direccion && m.fila.direccion) cambios.direccion = nombresProlijos ? prolijo(m.fila.direccion) : m.fila.direccion
          if ((ex?.codigo || '') === m.fila.codigo && !cambios.direccion) continue
          const { error } = await supabase.from('mant_clientes').update(cambios).eq('id', m.destino)
          if (error) throw new Error(`Edificio ${m.fila.codigo}: ${error.message}`)
          vinculados++
        }
      }
      // Mapa código → id (ya con los recién creados)
      const todos = await traerTodo<Existente>(() => supabase.from('mant_clientes').select('id, nombre, direccion, codigo').order('id'))
      const idDe = new Map(todos.filter(e => e.codigo).map(e => [e.codigo!.toUpperCase(), e.id]))

      // 2) Torres
      const filasT = torres.filter(t => idDe.has(t.edificio)).map(t => ({ cliente_id: idDe.get(t.edificio)!, codigo: t.codigo, nombre: nombresProlijos ? prolijo(t.nombre) : t.nombre }))
      if (filasT.length) {
        setTrabajando('Cargando torres...')
        const { error } = await supabase.from('edificio_torres').upsert(filasT, { onConflict: 'cliente_id,codigo' })
        if (error) throw new Error(`Torres: ${error.message}`)
        nTorres = filasT.length
      }

      // 3) Unidades (no toca el coeficiente que ya esté cargado)
      const filasU = unidades.filter(u => idDe.has(u.edificio)).map(u => ({
        cliente_id: idDe.get(u.edificio)!, torre: u.torre, unidad: u.unidad, ocupa: u.ocupa,
        propietario: u.propietario || null, propietario_tel: u.propietario_tel || null, propietario_email: u.propietario_email || null,
        inquilino: u.inquilino || null, inquilino_tel: u.inquilino_tel || null, inquilino_email: u.inquilino_email || null,
      }))
      for (let i = 0; i < filasU.length; i += 500) {
        setTrabajando(`Cargando unidades... ${Math.min(i + 500, filasU.length)} de ${filasU.length}`)
        const { error } = await supabase.from('edificio_unidades').upsert(filasU.slice(i, i + 500), { onConflict: 'cliente_id,torre,unidad' })
        if (error) throw new Error(`Unidades: ${error.message}`)
      }
      nUnidades = filasU.length

      const resumen = [creados && `${creados} edificios nuevos`, vinculados && `${vinculados} edificios actualizados`, nTorres && `${nTorres} torres`, nUnidades && `${nUnidades} unidades`].filter(Boolean).join(' · ') || 'Sin cambios'
      await registrarAudit({ accion: 'crear', tabla: 'edificio_unidades', descripcion: `Importación de padrón: ${resumen}` })
      setHecho(resumen)
      onDone()
    } catch (e: any) {
      showToast(`Se cortó la importación: ${e?.message || e}. Lo que ya se cargó queda guardado; podés volver a importar.`, 'error')
    }
    setTrabajando(null)
  }

  const setDestino = (i: number, destino: string) => setAnalisis(a => a && ({ ...a, matches: a.matches.map((m, j) => j === i ? { ...m, destino } : m) }))
  const nCodigo = analisis?.matches.filter(m => m.como === 'codigo').length || 0
  const aRevisar = analisis ? analisis.matches.map((m, i) => ({ m, i })).filter(x => x.m.como !== 'codigo') : []
  const nEdifConUnidades = analisis ? new Set(analisis.unidades.map(u => u.edificio)).size : 0

  return (
    <div className="pago-overlay open" onClick={e => { if (e.target === e.currentTarget && !trabajando) onClose() }}>
      <div className="pago-modal" style={{ width: 720, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800 }}>Importar edificios, torres y unidades</h3>
          <button onClick={onClose} disabled={!!trabajando} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Los archivos que exporta el sistema de gastos comunes (separados por punto y coma). Podés subir uno solo o los tres.
          No se borra nada: lo nuevo se crea y lo que ya existe se actualiza. El coeficiente que hayas cargado a mano se mantiene.
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
              <Mini label="Edificios en el archivo" valor={analisis.matches.length} />
              <Mini label="Ya cargados (mismo código)" valor={nCodigo} />
              <Mini label="Torres" valor={analisis.torres.length} />
              <Mini label="Unidades" valor={analisis.unidades.length} sub={nEdifConUnidades ? `de ${nEdifConUnidades} edificios` : undefined} />
            </div>

            {aRevisar.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Revisá estos edificios ({aRevisar.length})</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>Elegí si es uno que ya tenés cargado (para no duplicarlo) o si se crea nuevo. Los que encontré por nombre ya están elegidos.</div>
                <div style={{ border: '1px solid var(--border-soft)', borderRadius: 10, maxHeight: 300, overflowY: 'auto' }}>
                  {aRevisar.map(({ m, i }) => (
                    <div key={m.fila.codigo} style={{ display: 'grid', gridTemplateColumns: '54px 1fr minmax(200px, 1fr)', gap: 10, alignItems: 'center', padding: '8px 10px', borderTop: '1px solid var(--border-soft)', fontSize: 13 }}>
                      <strong>{m.fila.codigo}</strong>
                      <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{m.fila.nombre}</div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.fila.direccion}</div></div>
                      <select value={m.destino} onChange={e => setDestino(i, e.target.value)} style={{ fontSize: 13, borderColor: m.destino === 'nuevo' ? undefined : 'var(--gold)' }}>
                        <option value="nuevo">+ Crear edificio nuevo</option>
                        {analisis.existentes.filter(e => !e.codigo || e.codigo === m.fila.codigo).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(e => <option key={e.id} value={e.id}>Es: {e.nombre}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analisis.sinEdificio.length > 0 && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#92400E', background: '#FEF3C7', borderRadius: 8, padding: '9px 11px', marginBottom: 14 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>Estos códigos tienen torres o unidades pero el edificio no está cargado: <strong>{analisis.sinEdificio.join(', ')}</strong>. Se saltean; subí también el archivo de edificios para incluirlos.</span>
              </div>
            )}

            {analisis.matches.some(m => m.destino === 'nuevo') && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={nombresProlijos} onChange={e => setNombresProlijos(e.target.checked)} />
                Escribir los nombres prolijos (<em>Edificio Retamosa</em> en vez de <em>EDIFICIO RETAMOSA</em>)
              </label>
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
