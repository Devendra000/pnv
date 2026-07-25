import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channelId } = await params

  const channel = await prisma.channel.findFirst({
    where: {
      OR: [{ id: channelId }, { slug: channelId }],
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
          },
        },
      },
      createdBy: {
        select: { id: true, username: true, displayName: true },
      },
    },
  })

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 })
  }

  return NextResponse.json({ channel })
}
