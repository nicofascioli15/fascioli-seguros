import { redirect } from 'next/navigation'

// Contactos ahora vive dentro de Asambleas
export default function ContactosRedirect() {
  redirect('/asambleas/contactos')
}
