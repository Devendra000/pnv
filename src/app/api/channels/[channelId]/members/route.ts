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

  const members = await prisma.channelMember.findMany({
    where: { channelId },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  })

  return NextResponse.json({ members })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channelId } = await params
  const body = await req.json().catch(() => ({}))
  const targetUserId = body.userId || session.user.id

  const member = await prisma.channelMember.upsert({
    where: {
      channelId_userId: {
        channelId,
        userId: targetUserId,
      },
    },
    update: {},
    create: {
      channelId,
      userId: targetUserId,
    },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  })

  return NextResponse.json({ member })
}
