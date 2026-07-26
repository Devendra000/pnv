'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Settings, MessageCircle, LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

interface NavbarProps {
  session?: any
}

export function Navbar({ session: initialSession }: NavbarProps) {
  const pathname = usePathname()
  const { data: clientSession } = useSession()
  const session = initialSession || clientSession
  const user = session?.user

  const isActive = (path: string) => pathname.startsWith(path)
  const initial = (user?.name || user?.username || 'U')[0].toUpperCase()

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="font-bold text-lg text-primary hover:text-accent transition-colors flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm">
            D
          </div>
          <span>DocGen</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/documents/generate"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              isActive('/documents/generate')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generate Document</span>
          </Link>

          <Link
            href="/documents"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              isActive('/documents') && !isActive('/documents/generate')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Document Manager</span>
          </Link>

          <Link
            href="/chat"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              isActive('/chat')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat</span>
          </Link>
        </div>

        {/* User Session & Logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/50 border border-border text-xs">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[11px]">
                {initial}
              </div>
              <span className="font-medium text-foreground max-w-[120px] truncate">
                {user.name || user.username}
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
