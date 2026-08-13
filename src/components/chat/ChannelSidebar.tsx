"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Hash,
  Lock,
  Plus,
  Users,
  Shield,
  LogOut,
  UserCheck,
  Megaphone,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { CreateChannelModal } from "./CreateChannelModal"

import { socket } from "@/lib/socket-client"
import { useChatPresence } from "@/contexts/ChatPresenceContext"

interface ChannelSidebarProps {
  session: any
}

export function ChannelSidebar({ session }: ChannelSidebarProps) {
  const [channels, setChannels] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const channelsRef = useRef<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isOnline } = useChatPresence()

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels")
      if (res.ok) {
        const data = await res.json()
        setChannels(data.channels || [])
        channelsRef.current = data.channels || []
      }
    } catch (err) {
      console.error("Failed to fetch channels", err)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?excludeSelf=true")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
    }
  }

  useEffect(() => {
    fetchChannels()
    fetchUsers()
  }, [])

  // Listen for real-time channel activity emitted to personal user room
  useEffect(() => {
    const handleChannelActivity = (data: { channelId: string; senderId: string; senderName?: string; contentPreview?: string }) => {
      if (data.senderId === session?.user?.id) return

      const c = channelsRef.current.find(ch => ch.id === data.channelId)
      if (c) {
        let url = `/chat/${c.slug}`
        if (c.type === "DM") {
          const otherMember = c.members?.find((m: any) => m.userId !== session?.user?.id)
          if (otherMember?.user?.username) {
            url = `/dm/${otherMember.user.username}`
          }
        }

        const isCurrentChannel =
          pathname === `/chat/${c.slug}` ||
          pathname === `/chat/${c.id}` ||
          (c.type === "DM" &&
            c.members?.some(
              (m: any) =>
                m.user?.username && pathname === `/dm/${m.user.username}`
            ))

        if (isCurrentChannel) {
          fetch(`/api/channels/${c.id}/read`, { method: "POST" })
        }

        setChannels((prev) => {
          const next = prev.map((ch: any) => {
            if (ch.id === data.channelId) {
              return { ...ch, unreadCount: isCurrentChannel ? 0 : (ch.unreadCount || 0) + 1 }
            }
            return ch
          })
          channelsRef.current = next
          return next
        })
      }
    }



    socket.on("channel-activity", handleChannelActivity)

    return () => {
      socket.off("channel-activity", handleChannelActivity)
    }
  }, [pathname, session?.user?.id])

  // Listen for group deletion events to update sidebar in real time across all users
  useEffect(() => {
    const handleGroupDeleted = (data: { groupId: string; slug: string }) => {
      setChannels((prev) => prev.filter((c) => c.slug !== data.slug && c.id !== data.groupId))
      if (pathname === `/chat/${data.slug}`) {
        router.push("/chat")
      }
    }

    socket.on("group-deleted", handleGroupDeleted)

    return () => {
      socket.off("group-deleted", handleGroupDeleted)
    }
  }, [pathname, router])

  // Listen for account deletion event to kick deleted user out immediately
  useEffect(() => {
    const handleAccountDeleted = (data: { userId: string }) => {
      if (data.userId === session?.user?.id) {
        socket.disconnect()
        signOut({ callbackUrl: "/login" })
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== data.userId))
      }
    }

    socket.on("account-deleted", handleAccountDeleted)
    socket.on("user-deleted", handleAccountDeleted)

    return () => {
      socket.off("account-deleted", handleAccountDeleted)
      socket.off("user-deleted", handleAccountDeleted)
    }
  }, [session?.user?.id])

  // Automatically mark channel/DM as read when navigating to it
  useEffect(() => {
    if (!pathname || channels.length === 0) return

    if (pathname.startsWith("/chat/")) {
      const slug = pathname.replace("/chat/", "")
      const activeChannel = channels.find((c) => c.slug === slug || c.id === slug)
      if (activeChannel && activeChannel.unreadCount > 0) {
        fetch(`/api/channels/${activeChannel.id}/read`, { method: "POST" })
        setChannels((prev) =>
          prev.map((c) => (c.id === activeChannel.id ? { ...c, unreadCount: 0 } : c))
        )
      }
    } else if (pathname.startsWith("/dm/")) {
      const username = pathname.replace("/dm/", "")
      const dmChannel = channels.find(
        (c) =>
          c.type === "DM" &&
          c.members?.some((m: any) => m.user?.username === username)
      )
      if (dmChannel && dmChannel.unreadCount > 0) {
        fetch(`/api/channels/${dmChannel.id}/read`, { method: "POST" })
        setChannels((prev) => {
          const next = prev.map((c) => (c.id === dmChannel.id ? { ...c, unreadCount: 0 } : c))
          channelsRef.current = next
          return next
        })
      }
    }
  }, [pathname, channels])

  const markChannelRead = (channelId: string) => {
    fetch(`/api/channels/${channelId}/read`, { method: "POST" })
    setChannels((prev) => {
      const next = prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c))
      channelsRef.current = next
      return next
    })
  }

  const publicChannels = channels.filter(c => (c.type === "PUBLIC" || c.type === "ANNOUNCEMENT") && !c.slug.startsWith("group-"))
  const userGroupChannels = channels.filter(c => c.slug.startsWith("group-"))
  const privateChannels = channels.filter(c => c.type === "PRIVATE" && !c.slug.startsWith("group-"))
  const otherUsers = users.filter(u => u.id !== session?.user?.id)

  // Map DM channels to member user ID -> unreadCount
  const dmUnreadMap = new Map<string, number>()
  channels
    .filter((c) => c.type === "DM")
    .forEach((c) => {
      const otherMember = c.members?.find((m: any) => m.userId !== session?.user?.id)
      if (otherMember) {
        dmUnreadMap.set(otherMember.userId, c.unreadCount || 0)
      }
    })

  const handleChannelCreated = (newChannel: any) => {
    setChannels(prev => {
      const next = [...prev, { ...newChannel, unreadCount: 0 }]
      channelsRef.current = next
      return next
    })
    router.push(`/chat/${newChannel.slug}`)
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none shrink-0">
      {/* Header / Workspace Identity */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20 text-sm">
            P
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 leading-tight">PNV Workspace</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {session?.user?.name || session?.user?.username}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Public Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Channels</span>
            <button
              onClick={() => setModalOpen(true)}
              className="p-1 rounded-md hover:text-slate-200 hover:bg-slate-800 transition-all"
              title="Create Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            {publicChannels.map((c) => {
              const active = pathname === `/chat/${c.slug}`
              const Icon = c.type === "ANNOUNCEMENT" ? Megaphone : Hash
              return (
                <Link
                  key={c.id}
                  href={`/chat/${c.slug}`}
                  onClick={() => markChannelRead(c.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all ${active
                    ? "bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                  <span className="truncate flex-1">{c.name}</span>
                  {c.unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 min-w-4 h-4 rounded-full text-[10px] font-bold bg-indigo-500 text-white flex items-center justify-center shrink-0">
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* User Groups Section */}
        {userGroupChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2 text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                <Users className="w-3.5 h-3.5" /> My User Groups
              </span>
            </div>
            <div className="space-y-0.5">
              {userGroupChannels.map((c) => {
                const active = pathname === `/chat/${c.slug}`
                return (
                  <Link
                    key={c.id}
                    href={`/chat/${c.slug}`}
                    onClick={() => markChannelRead(c.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all ${active
                      ? "bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                  >
                    <span className="font-mono text-indigo-400 font-bold">@</span>
                    <span className="truncate flex-1">{c.name.replace(/^@/, "")}</span>
                    {c.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 min-w-4 h-4 rounded-full text-[10px] font-bold bg-indigo-500 text-white flex items-center justify-center shrink-0">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2 text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Private Channels</span>
            </div>
            <div className="space-y-0.5">
              {privateChannels.map((c) => {
                const active = pathname === `/chat/${c.slug}`
                return (
                  <Link
                    key={c.id}
                    href={`/chat/${c.slug}`}
                    onClick={() => markChannelRead(c.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all ${active
                      ? "bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                  >
                    <Lock className="w-4 h-4 shrink-0 text-amber-400/80" />
                    <span className="truncate flex-1">{c.name}</span>
                    {c.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 min-w-4 h-4 rounded-full text-[10px] font-bold bg-indigo-500 text-white flex items-center justify-center shrink-0">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Direct Messages</span>
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin/users"
                className="p-1 rounded-md hover:text-slate-200 hover:bg-slate-800 transition-all"
                title="Add Users"
              >
                <Plus className="w-4 h-4" />
              </Link>
            )}
          </div>
          <div className="space-y-0.5">
            {otherUsers.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-slate-500 italic">
                {session?.user?.role === "ADMIN" ? (
                  <span>No other members yet. <Link href="/admin/users" className="text-indigo-400 underline">Add users</Link></span>
                ) : (
                  <span>No other team members</span>
                )}
              </div>
            ) : (
              otherUsers.map((u) => {
                const active = pathname === `/dm/${u.username}`
                const unread = dmUnreadMap.get(u.id) || 0
                return (
                  <Link
                    key={u.id}
                    href={`/dm/${u.username}`}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-all ${active
                      ? "bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 uppercase shrink-0">
                      {u.username[0]}
                    </div>
                    <span className="truncate flex-1 flex items-center gap-1.5">
                      {u.displayName || u.username}
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline(u.id) ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />
                    </span>
                    {unread > 0 && (
                      <span className="px-1.5 py-0.2 min-w-4 h-4 rounded-full text-[10px] font-bold bg-indigo-500 text-white flex items-center justify-center shrink-0">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Admin Tools (Admin Only) */}
        {session?.user?.role === "ADMIN" && (
          <div>
            <div className="px-2 mb-2 text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Admin Tools
            </div>
            <div className="space-y-0.5">
              <Link
                href="/admin/users"
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all ${pathname === "/admin/users"
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
              >
                <Users className="w-4 h-4 text-amber-400/80" /> Manage Users
              </Link>
              <Link
                href="/admin/groups"
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all ${pathname === "/admin/groups"
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
              >
                <UserCheck className="w-4 h-4 text-amber-400/80" /> User Groups
              </Link>
            </div>
          </div>
        )}
      </div>

      <CreateChannelModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleChannelCreated}
      />
    </aside>
  )
}
