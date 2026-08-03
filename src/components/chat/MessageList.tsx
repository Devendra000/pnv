"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useSocket } from "@/hooks/useSocket"
import { MessageBubble } from "./MessageBubble"
import { Lock } from "lucide-react"

interface MessageListProps {
  channelId: string
  currentUserId: string
  onOpenThread?: (message: any) => void
}

export function MessageList({ channelId, currentUserId, onOpenThread }: MessageListProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()
  const highlightParam = searchParams?.get("highlight")

  const socket = useSocket(channelId)

  const fetchMessages = async () => {
    setLoading(true)
    setAccessDenied(false)
    try {
      const res = await fetch(`/api/messages/${channelId}`)
      if (res.status === 403) {
        setAccessDenied(true)
        setMessages([])
        return
      }
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error("Failed to fetch messages", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [channelId])

  useEffect(() => {
    const handleNewMessage = (newMessage: any) => {
      if (newMessage.channelId === channelId) {
        if (!newMessage.parentId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        } else {
          // Thread reply: increment parent message's reply count in real time
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === newMessage.parentId) {
                const currentCount = msg._count?.replies ?? msg.replies?.length ?? 0
                return {
                  ...msg,
                  _count: {
                    ...msg._count,
                    replies: currentCount + 1,
                  },
                }
              }
              return msg
            })
          )
        }
      }
    }

    socket.on("new-message", handleNewMessage)

    return () => {
      socket.off("new-message", handleNewMessage)
    }
  }, [socket, channelId])

  // Scroll logic for new messages or notification deep link highlight
  useEffect(() => {
    if (loading || accessDenied || messages.length === 0) return

    if (highlightParam) {
      setHighlightedId(highlightParam)
      const timer = setTimeout(() => {
        const targetElem = document.getElementById(`message-${highlightParam}`)
        if (targetElem) {
          targetElem.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 350)

      const fadeTimer = setTimeout(() => {
        setHighlightedId(null)
      }, 4000)

      return () => {
        clearTimeout(timer)
        clearTimeout(fadeTimer)
      }
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [highlightParam, messages, loading, accessDenied])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-xs">
        Loading messages...
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-center select-none">
        <Lock className="w-10 h-10 text-amber-400/80 mb-3 animate-pulse" />
        <p className="text-sm font-bold text-slate-200">Access Denied</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          You are no longer a member of this private group or channel and cannot view its messages.
        </p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-center">
        <p className="text-sm font-semibold text-slate-400">No messages yet</p>
        <p className="text-xs mt-1">Be the first to send a message in this channel!</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-4 divide-y divide-slate-800/30">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onOpenThread={onOpenThread}
          isHighlighted={message.id === highlightedId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
