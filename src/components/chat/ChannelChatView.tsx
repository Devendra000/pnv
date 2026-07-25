"use client"

import { useState, useEffect } from "react"
import { ChannelHeader } from "./ChannelHeader"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { ThreadPanel } from "./ThreadPanel"

interface ChannelChatViewProps {
  channelId: string
  session: any
  isDm?: boolean
  dmUser?: any
}

export function ChannelChatView({ channelId, session, isDm, dmUser }: ChannelChatViewProps) {
  const [channel, setChannel] = useState<any>(null)
  const [activeThread, setActiveThread] = useState<any>(null)

  useEffect(() => {
    if (isDm) return

    const fetchChannelDetails = async () => {
      try {
        const res = await fetch(`/api/channels/${channelId}`)
        if (res.ok) {
          const data = await res.json()
          setChannel(data.channel)
        }
      } catch (err) {
        console.error("Failed to fetch channel details", err)
      }
    }

    fetchChannelDetails()
  }, [channelId, isDm])

  const targetChannelId = channel?.id || channelId

  return (
    <div className="flex-1 flex h-full min-w-0 bg-slate-950 overflow-hidden">
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChannelHeader channel={channel} isDm={isDm} dmUser={dmUser} />
        <MessageList
          channelId={targetChannelId}
          currentUserId={session.user.id}
          onOpenThread={(msg) => setActiveThread(msg)}
        />
        <MessageInput channelId={targetChannelId} />
      </div>

      {activeThread && (
        <ThreadPanel
          parentMessage={activeThread}
          currentUserId={session.user.id}
          onClose={() => setActiveThread(null)}
        />
      )}
    </div>
  )
}
