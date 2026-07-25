"use client"

import { Hash, Lock, Users, Megaphone } from "lucide-react"

interface ChannelHeaderProps {
  channel: any
  isDm?: boolean
  dmUser?: any
}

export function ChannelHeader({ channel, isDm, dmUser }: ChannelHeaderProps) {
  if (isDm && dmUser) {
    return (
      <header className="h-16 px-6 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs uppercase shadow-md shadow-indigo-500/20">
            {dmUser.username[0]}
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {dmUser.displayName || dmUser.username}
            </h1>
            <p className="text-xs text-slate-400">Direct Message thread</p>
          </div>
        </div>
      </header>
    )
  }

  if (!channel) return null

  const Icon = channel.type === "PRIVATE" ? Lock : channel.type === "ANNOUNCEMENT" ? Megaphone : Hash

  return (
    <header className="h-16 px-6 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300">
          <Icon className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            #{channel.name}
          </h1>
          {channel.description && (
            <p className="text-xs text-slate-400 line-clamp-1">{channel.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-800">
        <Users className="w-3.5 h-3.5 text-indigo-400" />
        <span>{channel.members?.length || channel._count?.members || 1} members</span>
      </div>
    </header>
  )
}
