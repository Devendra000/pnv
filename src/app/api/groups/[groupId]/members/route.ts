import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { groupId } = await params
  const { userId, action } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const group = await prisma.userGroup.findUnique({ where: { id: groupId } })
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const channelSlug = `group-${group.handle}`
  let channel = await prisma.channel.findUnique({ where: { slug: channelSlug } })

  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        name: `@${group.handle}`,
        slug: channelSlug,
        type: "PRIVATE",
        description: `Group discussion channel for ${group.name} (@${group.handle})`,
        createdById: session.user.id,
      },
    })
  }

  if (action === "remove") {
    await prisma.userGroupMember.deleteMany({
      where: { groupId, userId },
    })

    await prisma.channelMember.deleteMany({
      where: { channelId: channel.id, userId },
    })

    return NextResponse.json({ success: true, action: "removed" })
  } else {
    const member = await prisma.userGroupMember.upsert({
      where: {
        groupId_userId: { groupId, userId },
      },
      update: {},
      create: { groupId, userId },
    })

    await prisma.channelMember.upsert({
      where: {
        channelId_userId: { channelId: channel.id, userId },
      },
      update: {},
      create: { channelId: channel.id, userId },
    })

    return NextResponse.json({ member, action: "added" })
  }
}
