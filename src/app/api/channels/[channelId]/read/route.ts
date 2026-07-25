import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channelId } = await params

  const channel = await prisma.channel.findFirst({
    where: { OR: [{ id: channelId }, { slug: channelId }] },
    select: { id: true },
  })

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 })
  }

  await prisma.channelMember.upsert({
    where: {
      channelId_userId: {
        channelId: channel.id,
        userId: session.user.id,
      },
    },
    update: {
      lastReadAt: new Date(),
    },
    create: {
      channelId: channel.id,
      userId: session.user.id,
      lastReadAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
