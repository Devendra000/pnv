import { auth } from '@/auth'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppDataProvider } from '@/contexts/AppDataContext'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Company Document Generator',
  description: 'Professional document generation and management system for companies',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const prefs = (session?.user as any)?.preferences || {}
  
  // Default to dark mode if not specified
  const themeMode = prefs.themeMode || 'dark'
  const htmlClass = themeMode === 'system' ? '' : themeMode
  
  // Build inline styles for accent colors if selected
  const inlineStyles = {
    ...(prefs.accentColor && { 
      '--primary': prefs.accentColor,
      '--ring': prefs.accentColor
    }),
    ...(prefs.backgroundColor && { 
      '--background': prefs.backgroundColor 
    })
  } as React.CSSProperties

  return (
    <html lang="en" className={htmlClass} style={inlineStyles} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <AuthProvider>
          <AppDataProvider>
            {children}
          </AppDataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
