'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Settings, MessageCircle } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname.startsWith(path)

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="font-bold text-lg text-primary hover:text-accent transition-colors">
          DocGen
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/documents/generate"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isActive('/documents/generate')
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium">Generate Document</span>
          </Link>

          <Link
            href="/documents"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isActive('/documents') && !isActive('/documents/generate')
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Document Manager</span>
          </Link>

          <Link
            href="/chat"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isActive('/chat')
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Chat</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
