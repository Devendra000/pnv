'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, Settings, MessageCircle, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { socket } from '@/lib/socket-client'
import { UserSettingsModal } from './UserSettingsModal'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false)

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
      fetch('/api/notifications', { method: 'PATCH' }).catch(() => { })
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
          PNV Consultants
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/documents/generate"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/documents/generate')
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium">Generate Document</span>
          </Link>

          <Link
            href="/documents"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/documents') && !isActive('/documents/generate')
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Document Manager</span>
          </Link>

          <Link
            href="/chat"
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isActive('/chat')
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

          {/* User Avatar & Dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 ring-2 ring-transparent hover:ring-primary/50 transition-all overflow-hidden flex items-center justify-center text-sm font-bold text-slate-500"
            >
              {session?.user?.avatarUrl ? (
                <img src={(session.user as any).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="uppercase">
                  {(session?.user as any)?.displayName?.charAt(0) || session?.user?.username?.charAt(0) || '?'}
                </span>
              )}
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {(session?.user as any)?.displayName || session?.user?.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{session?.user?.username}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        setIsThemeModalOpen(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        setIsLogoutAlertOpen(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <UserSettingsModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutAlertOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-foreground mb-2">Log out</h3>
            <p className="text-sm text-muted-foreground mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsLogoutAlertOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg shadow-md transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
