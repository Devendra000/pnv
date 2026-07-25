import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ChatLayout } from "@/components/chat/ChatLayout"

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
    <ChatLayout session={session}>
      {children}
    </ChatLayout>
  )
}
