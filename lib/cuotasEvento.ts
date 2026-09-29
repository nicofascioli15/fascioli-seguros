// Aviso interno: "cambiaron las cuotas cobradas". El menú lateral lo escucha para
// recalcular al instante el numerito rojo de "Pagos y cuotas" sin recargar la página.
export const EVENTO_CUOTAS = 'fascioli:cuotas-cambiaron'

export function avisarCuotasCambiaron() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CUOTAS))
}
