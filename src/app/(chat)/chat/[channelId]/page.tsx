import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ChannelChatView } from "@/components/chat/ChannelChatView"

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { channelId } = await params

  return <ChannelChatView channelId={channelId} session={session} />
}
