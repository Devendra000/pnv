import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const channels = await prisma.channel.findMany({
    where: {
      OR: [
        { type: "PUBLIC" },
        { type: "ANNOUNCEMENT" },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      },
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const channelsWithUnread = await Promise.all(
    channels.map(async (c) => {
      const currentUserMember = c.members.find((m) => m.userId === session.user.id)
      const lastReadAt = currentUserMember?.lastReadAt || new Date(0)

      const unreadCount = await prisma.message.count({
        where: {
          channelId: c.id,
          createdAt: { gt: lastReadAt },
          senderId: { not: session.user.id },
        },
      })

      return {
        ...c,
        unreadCount,
      }
    })
  )

  return NextResponse.json({ channels: channelsWithUnread })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, slug, description, type } = await req.json()

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
  }

  const channelSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-")

  const existing = await prisma.channel.findUnique({ where: { slug: channelSlug } })
  if (existing) {
    return NextResponse.json({ error: "Channel slug already exists" }, { status: 400 })
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      slug: channelSlug,
      description,
      type: type || "PUBLIC",
      createdById: session.user.id,
      members: {
        create: {
          userId: session.user.id,
        },
      },
    },
  })

  return NextResponse.json({ channel })
}
