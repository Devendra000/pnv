"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, MessageSquare, CheckCheck } from "lucide-react"
import { socket } from "@/lib/socket-client"

interface NotificationItem {
  id: string
  isRead: boolean
  createdAt: string
  message: {
    id: string
    contentRaw: string
    sender: { displayName: string | null; username: string }
    channel: { id: string; name: string; slug: string } | null
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err)
    }
  }

  useEffect(() => {
    fetchNotifications()

    const handleNotification = () => {
      fetchNotifications()
    }

    socket.on("notification", handleNotification)

    return () => {
      socket.off("notification", handleNotification)
    }
  }, [])

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (err) {
      console.error("Failed to mark notifications read", err)
    }
  }

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [n.id] }),
        })
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        )
      } catch (err) {
        console.error("Failed to mark notification read", err)
      }
    }

    setOpen(false)
    if (n.message?.channel?.slug) {
      router.push(`/chat/${n.message.channel.slug}?highlight=${n.message.id}`)
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const unreadNotifications = notifications.filter((n) => !n.isRead)
  const readNotifications = notifications.filter((n) => n.isRead)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-indigo-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-100">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Bell className="w-4 h-4 text-indigo-400" />
                Notifications
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No notifications
                </div>
              ) : (
                <>
                  {/* Unread Section */}
                  {unreadNotifications.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 bg-indigo-950/30 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 border-b border-slate-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        Unread ({unreadNotifications.length})
                      </div>
                      {unreadNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className="p-4 hover:bg-slate-800/80 cursor-pointer transition-all text-xs border-l-2 border-indigo-500 bg-indigo-950/10"
                        >
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-semibold text-slate-200">
                              {n.message?.sender?.displayName || n.message?.sender?.username}
                            </span>
                            <span>mentioned you in</span>
                            <span className="font-semibold text-indigo-400">
                              #{n.message?.channel?.name || "chat"}
                            </span>
                          </div>
                          <p className="text-slate-300 line-clamp-2 pl-5">
                            {n.message?.contentRaw}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Viewed (Read) Section */}
                  {readNotifications.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-800/50">
                        <CheckCheck className="w-3 h-3 text-slate-500" />
                        Viewed
                      </div>
                      {readNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className="p-4 hover:bg-slate-800/50 cursor-pointer transition-all text-xs opacity-70 hover:opacity-100"
                        >
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="font-semibold text-slate-300">
                              {n.message?.sender?.displayName || n.message?.sender?.username}
                            </span>
                            <span>mentioned you in</span>
                            <span className="font-semibold text-slate-400">
                              #{n.message?.channel?.name || "chat"}
                            </span>
                          </div>
                          <p className="text-slate-400 line-clamp-2 pl-5">
                            {n.message?.contentRaw}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
