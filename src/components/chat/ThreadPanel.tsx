"use client"

import { useState, useEffect, useRef } from "react"
import { X, MessageSquare, Loader2 } from "lucide-react"
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  
  // Resizable state
  const MIN_WIDTH = 320
  const MAX_WIDTH = 800
  const [panelWidth, setPanelWidth] = useState(384)
  const [isResizing, setIsResizing] = useState(false)
  const panelWidthRef = useRef(panelWidth)

  useEffect(() => {
    panelWidthRef.current = panelWidth
  }, [panelWidth])

  useEffect(() => {
    const saved = localStorage.getItem('threadPanelWidth')
    if (saved) {
      setPanelWidth(parseInt(saved, 10))
    }
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = document.body.clientWidth - e.clientX
      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem('threadPanelWidth', panelWidthRef.current.toString())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const fetchReplies = async () => {
    if (!parentMessage) return
    setLoading(true)
    try {
      const res = await fetch(`/api/messages/${parentMessage.channelId}?parentId=${parentMessage.id}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data.messages || [])
        setHasMore(data.messages?.length === 50)
      }
    } catch (err) {
      console.error("Failed to fetch thread replies", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMoreReplies = async () => {
    if (loadingMore || !hasMore || replies.length === 0) return
    
    setLoadingMore(true)
    const cursor = replies[0].id
    
    try {
      const res = await fetch(`/api/messages/${parentMessage.channelId}?parentId=${parentMessage.id}&cursor=${cursor}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        const olderReplies = data.messages || []
        
        if (olderReplies.length < 50) {
          setHasMore(false)
        }
        
        if (olderReplies.length > 0) {
          const container = scrollContainerRef.current
          const scrollHeightBefore = container?.scrollHeight || 0
          
          setReplies(prev => [...olderReplies, ...prev])
          
          requestAnimationFrame(() => {
            if (container) {
              const scrollHeightAfter = container.scrollHeight
              container.scrollTop = container.scrollTop + (scrollHeightAfter - scrollHeightBefore)
            }
          })
        }
      }
    } catch (err) {
      console.error("Failed to fetch older thread replies", err)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    if (scrollContainerRef.current.scrollTop < 50) {
      fetchMoreReplies()
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
      }
    }

    socket.on("new-message", handleNewMessage)

    return () => {
      socket.off("new-message", handleNewMessage)
    }
  }, [parentMessage?.id])

  useEffect(() => {
    if (!loadingMore && replies.length <= 50) {
      bottomRef.current?.scrollIntoView()
    }
  }, [loading, replies.length])

  if (!parentMessage) return null

  return (
    <aside 
      style={{ width: `${panelWidth}px` }}
      className={`relative bg-card border-l border-border flex flex-col h-full shrink-0 shadow-2xl transition-[width] duration-0 ${isResizing ? 'select-none' : ''}`}
    >
      {/* Resizer Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-primary/50 active:bg-primary z-50 transition-colors"
      />

      {/* Header */}
      <div className="p-4 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span>Thread</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-muted transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Parent Message Header */}
      <div className="p-2 border-b border-border/50 bg-muted/20">
        <MessageBubble message={parentMessage} currentUserId={currentUserId} />
      </div>

      {/* Replies Feed */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2 divide-y divide-border/30"
      >
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Loading replies...</div>
        ) : (
          <>
            {loadingMore && (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
            )}
            
            {replies.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No replies yet. Start the conversation!
              </div>
            ) : (
              replies.map((reply) => (
                <MessageBubble key={reply.id} message={reply} currentUserId={currentUserId} />
              ))
            )}
            <div ref={bottomRef} />
          </>
        )}
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
