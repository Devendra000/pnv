"use client"

import { useState, useEffect, useRef } from "react"
import { X, MessageSquare } from "lucide-react"
import { MessageBubble } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import { socket } from "@/lib/socket-client"

interface ThreadPanelProps {
  parentMessage: any
  currentUserId: string
  onClose: () => void
}

export function ThreadPanel({ parentMessage, currentUserId, onClose }: ThreadPanelProps) {
  const [replies, setReplies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchReplies = async () => {
    if (!parentMessage) return
    setLoading(true)
    try {
      const res = await fetch(`/api/messages/${parentMessage.channelId}?parentId=${parentMessage.id}`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data.messages || [])
      }
    } catch (err) {
      console.error("Failed to fetch thread replies", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReplies()
  }, [parentMessage?.id])

  useEffect(() => {
    const handleNewMessage = (newMessage: any) => {
      if (newMessage.parentId === parentMessage?.id) {
        setReplies((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev
          return [...prev, newMessage]
        })
      }
    }

    socket.on("new-message", handleNewMessage)

    return () => {
      socket.off("new-message", handleNewMessage)
    }
  }, [parentMessage?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [replies])

  if (!parentMessage) return null

  return (
    <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span>Thread</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Parent Message Header */}
      <div className="p-2 border-b border-slate-800/50 bg-slate-800/20">
        <MessageBubble message={parentMessage} currentUserId={currentUserId} />
      </div>

      {/* Replies Feed */}
      <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-800/30">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate-500">Loading replies...</div>
        ) : replies.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No replies yet. Start the conversation!
          </div>
        ) : (
          replies.map((reply) => (
            <MessageBubble key={reply.id} message={reply} currentUserId={currentUserId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply Input */}
      <MessageInput
        channelId={parentMessage.channelId}
        parentId={parentMessage.id}
        placeholder="Reply to thread..."
      />
    </aside>
  )
}
