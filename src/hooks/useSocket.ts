"use client"

// CLIENT-ONLY — always used inside "use client" components only.

import { useEffect } from "react"
import { socket } from "@/lib/socket-client"

/**
 * Joins the given channel room via Socket.io and cleans up on unmount
 * or when channelId changes. Returns the shared socket instance.
 */
export function useSocket(channelId: string) {
  useEffect(() => {
    const handleConnect = () => {
      socket.emit("join-channel", channelId)
    }

    // Join the channel room on the server so we receive new-message events
    socket.emit("join-channel", channelId)

    // Re-join on reconnect
    socket.on("connect", handleConnect)

    return () => {
      socket.off("connect", handleConnect)
      socket.emit("leave-channel", channelId)
    }
  }, [channelId])

  return socket
}
