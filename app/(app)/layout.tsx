import Sidebar from '@/components/Sidebar'
import { AuthProvider } from '@/lib/AuthProvider'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
    </AuthProvider>
  )
}

