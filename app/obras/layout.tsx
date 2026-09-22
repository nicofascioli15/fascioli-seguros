import ObrasSidebar from '@/components/ObrasSidebar'
import ModalScrollLock from '@/components/ModalScrollLock'
import AsistenteChat from '@/components/AsistenteChat'
import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function ObrasLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalScrollLock />
        <div className="app-shell">
          <ObrasSidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
        <AsistenteChat modulo="obras" />
      </AuthProvider>
    </ThemeProvider>
  )
}
