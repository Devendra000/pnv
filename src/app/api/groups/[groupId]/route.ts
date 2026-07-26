import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getIO } from "@/lib/socket-server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { groupId } = await params
  const { name, handle } = await req.json()

  const group = await prisma.userGroup.findUnique({ where: { id: groupId } })
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const updateData: any = {}

  if (name !== undefined && name.trim()) {
    updateData.name = name.trim()
  }

  let oldChannelSlug = `group-${group.handle}`
  let newChannelSlug = oldChannelSlug

  if (handle !== undefined && handle.trim()) {
    const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (cleanHandle !== group.handle) {
      // Check if handle is taken by another group
      const existingGroup = await prisma.userGroup.findFirst({
        where: { handle: cleanHandle, id: { not: groupId } },
      })
      if (existingGroup) {
        return NextResponse.json(
          { error: `Group handle @${cleanHandle} is already taken by another group.` },
          { status: 400 }
        )
      }

      // Check if handle is taken by a user
      const existingUser = await prisma.user.findFirst({
        where: { username: { equals: cleanHandle, mode: "insensitive" } },
      })
      if (existingUser) {
        return NextResponse.json(
          { error: `Handle @${cleanHandle} is already taken by a workspace user.` },
          { status: 400 }
        )
      }

      updateData.handle = cleanHandle
      newChannelSlug = `group-${cleanHandle}`
    }
  }

  const updatedGroup = await prisma.userGroup.update({
    where: { id: groupId },
    data: updateData,
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      },
    },
  })

  // Update corresponding Channel name and slug if handle changed
  if (updateData.handle || updateData.name) {
    const channel = await prisma.channel.findFirst({
      where: { OR: [{ slug: oldChannelSlug }, { slug: newChannelSlug }] },
    })

    if (channel) {
      await prisma.channel.update({
        where: { id: channel.id },
        data: {
          name: `@${updatedGroup.handle}`,
          slug: `group-${updatedGroup.handle}`,
          description: `Group discussion channel for ${updatedGroup.name} (@${updatedGroup.handle})`,
        },
      })
    }
  }

  return NextResponse.json({ group: updatedGroup })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { groupId } = await params

  const group = await prisma.userGroup.findUnique({ where: { id: groupId } })
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const channelSlug = `group-${group.handle}`

  // Delete UserGroup
  await prisma.userGroup.delete({
    where: { id: groupId },
  })

  // Delete associated group channel if exists
  await prisma.channel.deleteMany({
    where: { slug: channelSlug },
  })

  // Emit real-time WebSocket event to all clients to update sidebars instantly
  try {
    const io = getIO()
    io.emit("group-deleted", { groupId, slug: channelSlug })
  } catch (err) {
    console.error("[Socket.io] Error emitting group-deleted:", err)
  }

  return NextResponse.json({ success: true })
}
