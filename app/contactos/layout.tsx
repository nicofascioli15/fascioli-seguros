import { AuthProvider } from '@/lib/AuthProvider'
import { ThemeProvider } from '@/lib/ThemeProvider'

export const dynamic = 'force-dynamic'

export default function ContactosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div style={{ minHeight: '100vh', background: 'var(--bg, #F3F5F9)' }}>{children}</div>
      </AuthProvider>
    </ThemeProvider>
  )
}
