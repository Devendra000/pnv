import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getIO } from "@/lib/socket-server"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { userId } = await params
  const { username, displayName, email, role, password, isActive } = await req.json()

  const updateData: any = {}

  if (username !== undefined && username.trim()) {
    const cleanUsername = username.toLowerCase().trim()

    // Check if username matches an existing group handle
    const existingGroup = await prisma.userGroup.findUnique({
      where: { handle: cleanUsername },
    })
    if (existingGroup) {
      return NextResponse.json(
        { error: `Username @${cleanUsername} is already taken by a User Group.` },
        { status: 400 }
      )
    }

    // Check if username matches another existing user
    const existingUser = await prisma.user.findFirst({
      where: { username: cleanUsername, id: { not: userId } },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: `Username @${cleanUsername} is already taken by another user.` },
        { status: 400 }
      )
    }

    updateData.username = cleanUsername
  }

  if (displayName !== undefined) updateData.displayName = displayName
  if (email !== undefined) updateData.email = email
  if (role !== undefined) updateData.role = role
  if (isActive !== undefined) updateData.isActive = isActive
  if (password && password.trim()) {
    updateData.passwordHash = await bcrypt.hash(password.trim(), 12)
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
    },
  })

  return NextResponse.json({ user })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { userId } = await params

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 })
  }

  // Find fallback admin to reassign created channels and groups to
  const fallbackAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", id: { not: userId } },
    select: { id: true },
  })

  const fallbackId = fallbackAdmin?.id || session.user.id

  // Perform clean cascade deletion transaction
  await prisma.$transaction([
    // Reassign channel & group ownership to fallback admin
    prisma.channel.updateMany({
      where: { createdById: userId },
      data: { createdById: fallbackId },
    }),
    prisma.userGroup.updateMany({
      where: { createdById: userId },
      data: { createdById: fallbackId },
    }),
    // Delete memberships, mentions, and notifications
    prisma.channelMember.deleteMany({ where: { userId } }),
    prisma.userGroupMember.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.messageMention.deleteMany({ where: { mentionedUserId: userId } }),
    // Delete Auth.js accounts and sessions
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    // Delete user messages
    prisma.message.deleteMany({ where: { senderId: userId } }),
    // Delete the user record
    prisma.user.delete({ where: { id: userId } }),
  ])

  // Emit real-time WebSocket event to kick deleted user out immediately
  try {
    const io = getIO()
    io.to(`user:${userId}`).emit("account-deleted", { userId })
    io.emit("user-deleted", { userId })
  } catch (err) {
    console.error("[Socket.io] Error emitting account-deleted:", err)
  }

  return NextResponse.json({ success: true })
}
