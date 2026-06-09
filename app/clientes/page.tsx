'use client'
import { useState } from 'react'
import ClientesList from './ClientesList'
import ClienteDetalle from './ClienteDetalle'

export default function ClientesPage() {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null)

  if (clienteSeleccionado) {
    return (
      <ClienteDetalle
        nombre={clienteSeleccionado}
        onBack={() => setClienteSeleccionado(null)}
      />
    )
  }

  return <ClientesList onSelect={setClienteSeleccionado} />
}
