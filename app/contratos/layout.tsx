import ContratosSidebar from '@/components/ContratosSidebar'
import ModalScrollLock from '@/components/ModalScrollLock'
import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function ContratosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalScrollLock />
        <div className="app-shell">
          <ContratosSidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}
