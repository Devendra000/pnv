"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { socket } from "@/lib/socket-client"

interface ChatPresenceContextType {
  onlineUsers: Set<string>
  isOnline: (userId: string) => boolean
}

const ChatPresenceContext = createContext<ChatPresenceContextType | undefined>(undefined)

export function ChatPresenceProvider({ children }: { children: ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    // When the socket connects or the component mounts, fetch the initial list
    const fetchOnlineUsers = () => {
      socket.emit("get-online-users", (users: string[]) => {
        setOnlineUsers(new Set(users))
      })
    }

    if (socket.connected) {
      fetchOnlineUsers()
    } else {
      socket.connect()
    }

    socket.on("connect", fetchOnlineUsers)

    socket.on("user-online", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.add(userId)
        return next
      })
    })

    socket.on("user-offline", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    })

    return () => {
      socket.off("connect", fetchOnlineUsers)
      socket.off("user-online")
      socket.off("user-offline")
    }
  }, [])

  const isOnline = (userId: string) => onlineUsers.has(userId)

  return (
    <ChatPresenceContext.Provider value={{ onlineUsers, isOnline }}>
      {children}
    </ChatPresenceContext.Provider>
  )
}

export function useChatPresence() {
  const context = useContext(ChatPresenceContext)
  if (context === undefined) {
    throw new Error("useChatPresence must be used within a ChatPresenceProvider")
  }
  return context
}
