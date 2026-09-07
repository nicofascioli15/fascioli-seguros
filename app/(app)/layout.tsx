import Sidebar from '@/components/Sidebar'
import GlobalSearch from '@/components/GlobalSearch'
import ModalScrollLock from '@/components/ModalScrollLock'
import AsistenteChat from '@/components/AsistenteChat'
import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalScrollLock />
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            <div className="topbar-search">
              <GlobalSearch />
            </div>
            {children}
          </main>
        </div>
        <AsistenteChat />
      </AuthProvider>
    </ThemeProvider>
  )
}


