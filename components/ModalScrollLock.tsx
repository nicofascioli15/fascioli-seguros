'use client'
import { useEffect } from 'react'

// Bloquea el scroll del body/main-content cuando cualquier modal (.pago-overlay.open)
// está presente en el DOM. Funciona automáticamente para todos los modales de la app
// sin necesidad de tocarlos uno por uno.
export default function ModalScrollLock() {
  useEffect(() => {
    function checkModals() {
      const hasOpenModal = document.querySelector('.pago-overlay.open') !== null
      const mainContent = document.querySelector('.main-content') as HTMLElement | null

      if (hasOpenModal) {
        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
        if (mainContent) {
          mainContent.style.overflow = 'hidden'
        }
      } else {
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
        if (mainContent) {
          mainContent.style.overflow = ''
        }
      }
    }

    // Chequeo inicial
    checkModals()

    // Observa cambios en el DOM (apertura/cierre de modales, cambio de clase "open")
    const observer = new MutationObserver(checkModals)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      observer.disconnect()
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      const mainContent = document.querySelector('.main-content') as HTMLElement | null
      if (mainContent) mainContent.style.overflow = ''
    }
  }, [])

  return null
}

