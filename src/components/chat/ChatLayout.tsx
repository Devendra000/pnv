"use client"

import { ChannelSidebar } from "./ChannelSidebar"

interface ChatLayoutProps {
  session: any
  children: React.ReactNode
}

export function ChatLayout({ session, children }: ChatLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <ChannelSidebar session={session} />
      <main className="flex-1 flex min-w-0 h-full overflow-hidden">
        {children}
      </main>
    </div>
  )
}
