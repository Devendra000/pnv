"use client"

import Link from "next/link"
import { MessageSquare, Users } from "lucide-react"

interface MessageBubbleProps {
  message: any
  currentUserId: string
  onOpenThread?: (message: any) => void
  isHighlighted?: boolean
}

export function MessageBubble({ message, currentUserId, onOpenThread, isHighlighted }: MessageBubbleProps) {
  const isOwner = message.senderId === currentUserId
  const senderName = message.sender?.displayName || message.sender?.username || "Unknown"
  const avatarLetter = (message.sender?.username || "U")[0].toUpperCase()

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  // Map of valid mention handles for this message to metadata
  const validMentionMap = new Map<
    string,
    {
      type: "user" | "group" | "special"
      username?: string
      handle?: string
      name?: string
      members?: string[]
    }
  >()

  // Register special broadcast tags
  validMentionMap.set("everyone", { type: "special" })
  validMentionMap.set("here", { type: "special" })
  validMentionMap.set("channel", { type: "special" })

  if (message.mentions && Array.isArray(message.mentions)) {
    message.mentions.forEach((m: any) => {
      if (m.mentionedUser?.username) {
        validMentionMap.set(m.mentionedUser.username.toLowerCase(), {
          type: "user",
          username: m.mentionedUser.username,
        })
      }
      if (m.group?.handle) {
        const memberNames = (m.group.members || []).map(
          (mem: any) => mem.user?.displayName || mem.user?.username || "user"
        )
        validMentionMap.set(m.group.handle.toLowerCase(), {
          type: "group",
          handle: m.group.handle,
          name: m.group.name,
          members: memberNames,
        })
      }
    })
  }

  // Format content: block UI only for valid groups, users, and broadcast tags
  const renderFormattedContent = (text: string) => {
    if (!text) return null
    const parts = text.split(/(@[a-zA-Z0-9_-]+)/g)

    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const handleCandidate = part.slice(1).toLowerCase()
        const mentionInfo = validMentionMap.get(handleCandidate)

        if (mentionInfo) {
          if (mentionInfo.type === "group") {
            const memberCount = mentionInfo.members?.length || 0
            const memberText =
              memberCount > 0
                ? `${memberCount} member(s): ${mentionInfo.members?.join(", ")}`
                : "No members"

            return (
              <Link
                key={idx}
                href={`/chat/group-${mentionInfo.handle}`}
                title={`Group @${mentionInfo.handle} • ${memberText}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30 transition-all cursor-pointer shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{part}</span>
              </Link>
            )
          }

          if (mentionInfo.type === "user") {
            return (
              <Link
                key={idx}
                href={`/dm/${mentionInfo.username}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-semibold text-xs border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
              >
                <span>{part}</span>
              </Link>
            )
          }

          if (mentionInfo.type === "special") {
            return (
              <span
                key={idx}
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold text-xs border border-indigo-500/30 shadow-sm"
              >
                {part}
              </span>
            )
          }
        }
      }

      // Invalid handles (e.g. @nogkinggroup) render as plain text
      return part
    })
  }

  const replyCount = message._count?.replies || message.replies?.length || 0

  return (
    <div
      id={`message-${message.id}`}
      className={`flex gap-3 px-4 py-2.5 transition-all duration-500 group ${
        isHighlighted
          ? "bg-indigo-600/30 border-y-2 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500/50"
          : isOwner
          ? "bg-indigo-950/10 hover:bg-slate-800/30"
          : "hover:bg-slate-800/30"
      }`}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 uppercase shrink-0 mt-0.5">
        {avatarLetter}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-bold text-slate-200">{senderName}</span>
          <span className="text-[10px] text-slate-500">{formattedTime}</span>
        </div>

        <div className="text-sm text-slate-300 leading-relaxed break-words">
          {renderFormattedContent(message.contentRaw)}
        </div>

        {/* Thread reply button */}
        {onOpenThread && (
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => onOpenThread(message)}
              className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {replyCount > 0 ? (
                <span className="font-semibold text-indigo-400">
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </span>
              ) : (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  Reply in thread
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
