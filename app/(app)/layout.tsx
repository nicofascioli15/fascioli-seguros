import Sidebar from '@/components/Sidebar'
import GlobalSearch from '@/components/GlobalSearch'
import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            <div className="topbar-search">
              <GlobalSearch />
            </div>
            {children}
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}


