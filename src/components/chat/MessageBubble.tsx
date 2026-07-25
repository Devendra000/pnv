"use client"

import { MessageSquare } from "lucide-react"

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

  // Format content with highlighted mentions
  const renderFormattedContent = (text: string) => {
    if (!text) return null
    const parts = text.split(/(@[a-zA-Z0-9_-]+)/g)

    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold text-xs border border-indigo-500/30"
          >
            {part}
          </span>
        )
      }
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
