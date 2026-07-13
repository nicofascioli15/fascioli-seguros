import MantSidebar from '@/components/MantSidebar'
import ModalScrollLock from '@/components/ModalScrollLock'
import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function MantenimientoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalScrollLock />
        <div className="app-shell">
          <MantSidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}
