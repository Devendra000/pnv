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
  const { searchParams } = new URL(req.url)

  const parentId = searchParams.get("parentId")
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  const channel = await prisma.channel.findFirst({
    where: { OR: [{ id: channelId }, { slug: channelId }] },
    select: { id: true },
  })

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId: channel.id,
      parentId: parentId ? parentId : null,
      deletedAt: null,
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { replies: true },
      },
    },
  })

  return NextResponse.json({ messages })
}
