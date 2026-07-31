import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ChatLayout } from "@/components/chat/ChatLayout"

import { Navbar } from '@/components/Navbar'

export default async function ChatRouteGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="flex flex-1 min-h-0 overflow-hidden pt-16">
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <ChatLayout session={session}>
            {children}
          </ChatLayout>
        </main>
      </div>
    </div>
  )
}
