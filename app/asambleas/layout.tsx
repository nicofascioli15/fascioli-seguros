import AsambleasSidebar from '@/components/AsambleasSidebar'
import ModalScrollLock from '@/components/ModalScrollLock'
import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function AsambleasLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalScrollLock />
        <div className="app-shell">
          <AsambleasSidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}
