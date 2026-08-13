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
    include: {
      members: { select: { userId: true } },
    },
  })

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 })
  }

  // Access Control: PRIVATE and DM channels require active membership or ADMIN role
  const isMember = channel.members.some((m) => m.userId === session.user.id)
  const isAdmin = session.user.role === "ADMIN"

  if ((channel.type === "PRIVATE" || channel.type === "DM") && !isMember && !isAdmin) {
    return NextResponse.json(
      { error: "Forbidden: You are not a member of this private group channel" },
      { status: 403 }
    )
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId: channel.id,
      parentId: parentId ? parentId : null,
      deletedAt: null,
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      mentions: {
        include: {
          mentionedUser: { select: { id: true, username: true, displayName: true } },
          group: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, username: true, displayName: true } },
                },
              },
            },
          },
        },
      },
      _count: {
        select: { replies: true },
      },
    },
  })

  // Protect against huge message payloads (very large contentParsed JSON)
  const SAFE_BYTES = 100 * 1024 // 100KB

  const sanitized = messages.map((m: any) => {
    let safeContent = m.contentParsed
    let preview: string | null = null

    try {
      const str = JSON.stringify(m.contentParsed)
      if (str.length > SAFE_BYTES) {
        preview = str.slice(0, 10 * 1024) // store first 10KB as preview
        safeContent = null
        console.warn(`[messages] trimmed contentParsed for message ${m.id} (${str.length} bytes)`)
      }
    } catch (err) {
      // If stringify fails, drop the field to avoid throwing during serialization
      safeContent = null
      preview = null
      console.warn(`[messages] failed stringify contentParsed for message ${m.id}`)
    }

    return { ...m, contentParsed: safeContent, contentParsedPreview: preview }
  })

  // We fetched descending to get the newest messages, but client expects chronological order
  return NextResponse.json({ messages: sanitized.reverse() })
}
