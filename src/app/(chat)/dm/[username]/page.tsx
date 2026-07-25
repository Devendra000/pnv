import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ChannelChatView } from "@/components/chat/ChannelChatView"

export default async function DirectMessagePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { username } = await params

  const targetUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true },
  })

  if (!targetUser) {
    redirect("/chat")
  }

  // Find or create a DM channel between session user and target user
  const dmSlug = [session.user.username, targetUser.username].sort().join("-dm-")

  let dmChannel = await prisma.channel.findUnique({
    where: { slug: dmSlug },
  })

  if (!dmChannel) {
    dmChannel = await prisma.channel.create({
      data: {
        name: `@${targetUser.displayName || targetUser.username}`,
        slug: dmSlug,
        type: "DM",
        createdById: session.user.id,
        members: {
          createMany: {
            data: [
              { userId: session.user.id },
              { userId: targetUser.id },
            ],
          },
        },
      },
    })
  }

  return <ChannelChatView channelId={dmChannel.id} session={session} isDm={true} dmUser={targetUser} />
}
