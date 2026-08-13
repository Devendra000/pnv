"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useSocket } from "@/hooks/useSocket"
import { MessageBubble } from "./MessageBubble"
import { Lock, Loader2 } from "lucide-react"

interface MessageListProps {
  channelId: string
  currentUserId: string
  onOpenThread?: (message: any) => void
}

export function MessageList({ channelId, currentUserId, onOpenThread }: MessageListProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()
  const highlightParam = searchParams?.get("highlight")

  const socket = useSocket(channelId)

  const fetchMessages = async () => {
    setLoading(true)
    setAccessDenied(false)
    try {
      const res = await fetch(`/api/messages/${channelId}?limit=50`)
      if (res.status === 403) {
        setAccessDenied(true)
        setMessages([])
        return
      }
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setHasMore(data.messages?.length === 50)
      }
    } catch (err) {
      console.error("Failed to fetch messages", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    
    setLoadingMore(true)
    const cursor = messages[0].id // oldest message is at the top
    
    try {
      const res = await fetch(`/api/messages/${channelId}?cursor=${cursor}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        const olderMessages = data.messages || []
        
        if (olderMessages.length < 50) {
          setHasMore(false)
        }
        
        if (olderMessages.length > 0) {
          const container = scrollContainerRef.current
          const scrollHeightBefore = container?.scrollHeight || 0
          
          setMessages(prev => [...olderMessages, ...prev])
          
          // Maintain scroll position after React renders the new messages
          requestAnimationFrame(() => {
            if (container) {
              const scrollHeightAfter = container.scrollHeight
              container.scrollTop = container.scrollTop + (scrollHeightAfter - scrollHeightBefore)
            }
          })
        }
      }
    } catch (err) {
      console.error("Failed to fetch older messages", err)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    // Fetch more when we scroll within 50px of the top
    if (scrollContainerRef.current.scrollTop < 50) {
      fetchMoreMessages()
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
          
          // Auto scroll to bottom for new messages
          if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const isSelf = newMessage.senderId === currentUserId
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
            if (isSelf || isNearBottom) {
              setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" })
              }, 100)
            }
          }
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

  // Scroll logic for initial load or notification deep link highlight
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
    } else if (!loadingMore && messages.length <= 50) {
      // Only scroll to bottom on initial load, not when loading older messages
      bottomRef.current?.scrollIntoView()
    }
  }, [highlightParam, loading, accessDenied, messages.length])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-xs">
        Loading messages...
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground text-center select-none">
        <Lock className="w-10 h-10 text-amber-400/80 mb-3 animate-pulse" />
        <p className="text-sm font-bold text-foreground">Access Denied</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          You are no longer a member of this private group or channel and cannot view its messages.
        </p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground text-center">
        <p className="text-sm font-semibold text-muted-foreground">No messages yet</p>
        <p className="text-xs mt-1">Be the first to send a message in this channel!</p>
      </div>
    )
  }

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-4 divide-y divide-border/30"
    >
      {loadingMore && (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
      )}
      
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
