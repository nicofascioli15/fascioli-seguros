'use client'
import { useEffect, useState } from 'react'

// ¿Mostrar Asambleas en "modo app" (táctil)? Automático según el dispositivo
// (pantalla táctil sin mouse: celular / tablet), con opción de forzar la vista de computadora.
const CLAVE = 'fascioli-asambleas-vista'   // 'compu' | 'tactil' | (vacío = automático)

export function detectarTactil(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const forzada = localStorage.getItem(CLAVE)
    if (forzada === 'compu') return false
    if (forzada === 'tactil') return true
  } catch {}
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const sinHover = window.matchMedia?.('(hover: none)').matches
  return !!(coarse && sinHover)
}

export function elegirVista(v: 'compu' | 'tactil' | null) {
  try { if (v) localStorage.setItem(CLAVE, v); else localStorage.removeItem(CLAVE) } catch {}
}

// undefined mientras se detecta (evita parpadeos), después true/false
export function useVistaTactil(): boolean | undefined {
  const [t, setT] = useState<boolean | undefined>(undefined)
  useEffect(() => { setT(detectarTactil()) }, [])
  return t
}
