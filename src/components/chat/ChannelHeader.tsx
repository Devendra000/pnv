"use client"

import Link from "next/link"
import { Hash, Lock, Users, Megaphone } from "lucide-react"

interface ChannelHeaderProps {
  channel: any
  isDm?: boolean
  dmUser?: any
}

export function ChannelHeader({ channel, isDm, dmUser }: ChannelHeaderProps) {
  if (isDm && dmUser) {
    return (
      <header className="h-16 px-6 bg-background/50 border-b border-border flex items-center justify-between backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/u/${dmUser.username}`} className="shrink-0 hover:opacity-80 transition-opacity">
            {dmUser.avatarUrl ? (
              <img src={dmUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-md" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs uppercase shadow-md shadow-indigo-500/20">
                {dmUser.username[0]}
              </div>
            )}
          </Link>
          <div>
            <Link href={`/u/${dmUser.username}`} className="hover:underline">
              <h1 className="text-base font-bold text-foreground flex items-center gap-2">
                {dmUser.displayName || dmUser.username}
              </h1>
            </Link>
            <p className="text-xs text-muted-foreground">Direct Message thread</p>
          </div>
        </div>
      </header>
    )
  }

  if (!channel) return null

  const Icon = channel.type === "PRIVATE" ? Lock : channel.type === "ANNOUNCEMENT" ? Megaphone : Hash

  return (
    <header className="h-16 px-6 bg-background/50 border-b border-border flex items-center justify-between backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-muted border border-border/80 flex items-center justify-center text-foreground">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            #{channel.name}
          </h1>
          {channel.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{channel.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl border border-border">
        <Users className="w-3.5 h-3.5 text-primary" />
        <span>{channel.members?.length || channel._count?.members || 1} members</span>
      </div>
    </header>
  )
}
