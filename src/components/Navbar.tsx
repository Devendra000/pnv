'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Settings, MessageCircle, Palette } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { socket } from '@/lib/socket-client'
import { ThemeSettingsModal } from './ThemeSettingsModal'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)

  const isActive = (path: string) => pathname?.startsWith(path)

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/channels")
      if (res.ok) {
        const data = await res.json()
        const channels = data.channels || []
        const totalUnread = channels.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
        setUnreadCount(totalUnread)
      }
    } catch (err) {
      console.error("Failed to fetch channels for unread count", err)
    }
  }

  useEffect(() => {
    const isChatPage = pathname?.startsWith('/chat') || pathname?.startsWith('/dm');
    if (isChatPage) {
      // Mark mentions as read in background since there's no UI for them anymore
      fetch('/api/notifications', { method: 'PATCH' }).catch(() => {})
    } else {
      // If returning to non-chat page, refresh the global unread count
      fetchUnreadCount();
    }
  }, [pathname])

  useEffect(() => {
    fetchUnreadCount()

    const handleNotification = () => {
      // Mentions are part of channels, so we can re-fetch channels count if needed, 
      // but usually channel-activity fires too. We can just refetch.
      fetchUnreadCount()
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission()
      }
    }

    const playNotificationSound = () => {
      try {
        const audio = new Audio("/notification.wav")
        audio.play().catch(e => console.log("Audio play failed:", e))
      } catch (err) { }
    }

    const showPushNotification = (senderName?: string, contentPreview?: string, channelName?: string, url?: string) => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const title = channelName && !channelName.startsWith('@')
          ? `New message in ${channelName}`
          : `New message from ${senderName || 'someone'}`
        const notification = new Notification(title, {
          body: contentPreview || "You have a new message",
        })
        notification.onclick = () => {
          window.focus()
          if (url) {
            router.push(url)
          }
          notification.close()
        }
      }
    }

    const handleChannelActivity = (data: { channelId: string; senderId: string; senderName?: string; contentPreview?: string; url?: string; channelName?: string }) => {
      if (session?.user?.id && data.senderId === session.user.id) return

      // Don't show push notification if user is already looking at that channel
      const isCurrentChannel = typeof window !== "undefined" && window.location.pathname === data.url;

      if (!isCurrentChannel) {
        setUnreadCount(prev => prev + 1)
      }

      if (!isCurrentChannel || (typeof document !== "undefined" && !document.hasFocus())) {
        playNotificationSound()
        showPushNotification(data.senderName, data.contentPreview, data.channelName, data.url)
      }
    }

    socket.on("notification", handleNotification)
    socket.on("channel-activity", handleChannelActivity)

    return () => {
      socket.off("notification", handleNotification)
      socket.off("channel-activity", handleChannelActivity)
    }
  }, [session?.user?.id, router])

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
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isActive('/chat')
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Chat</span>
            {unreadCount > 0 && !(pathname?.startsWith('/chat') || pathname?.startsWith('/dm')) && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[20px] h-5 bg-indigo-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-md">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Theme Settings Button */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Appearance Settings"
          >
            <Palette className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <ThemeSettingsModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
      />
    </nav>
  )
}
