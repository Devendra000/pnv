import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getIO } from "@/lib/socket-server"
import { parseMentions } from "@/lib/mention-parser"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channelId, content, contentParsed, parentId } = await req.json()

  if (!channelId || !content?.trim()) {
    return NextResponse.json({ error: "channelId and content are required" }, { status: 400 })
  }

  // 0. Resolve channelId (supports both channel UUID/CUID and slug)
  const targetChannel = await prisma.channel.findFirst({
    where: { OR: [{ id: channelId }, { slug: channelId }] },
    select: { id: true, type: true, members: { select: { userId: true } } },
  })

  if (!targetChannel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 })
  }

  const realChannelId = targetChannel.id

  // 1. Create message record
  const message = await prisma.message.create({
    data: {
      channelId: realChannelId,
      senderId: session.user.id,
      contentRaw: content,
      contentParsed: contentParsed ?? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] },
      parentId: parentId ?? null,
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  })

  // 2. Resolve users and groups for mention parsing
  const [allUsers, allGroups] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true } }),
    prisma.userGroup.findMany({ select: { id: true, handle: true } }),
  ])

  const userMap: Record<string, string> = {}
  allUsers.forEach((u) => {
    userMap[u.username.toLowerCase()] = u.id
  })

  const groupMap: Record<string, string> = {}
  allGroups.forEach((g) => {
    groupMap[g.handle.toLowerCase()] = g.id
  })

  const parsedMentions = parseMentions(content, userMap, groupMap)

  // 3. Gather user IDs to create notifications for
  const userIdsToNotify = new Set<string>()

  for (const mention of parsedMentions) {
    if (mention.type === "USER") {
      userIdsToNotify.add(mention.userId)
      await prisma.messageMention.create({
        data: {
          messageId: message.id,
          mentionedUserId: mention.userId,
          mentionType: "USER",
        },
      })
    } else if (mention.type === "CHANNEL" || mention.type === "EVERYONE" || mention.type === "HERE") {
      const channelMembers = await prisma.channelMember.findMany({
        where: { channelId: realChannelId },
        select: { userId: true },
      })
      channelMembers.forEach((m) => userIdsToNotify.add(m.userId))

      await prisma.messageMention.create({
        data: {
          messageId: message.id,
          mentionType: mention.type,
        },
      })
    } else if (mention.type === "GROUP") {
      const groupMembers = await prisma.userGroupMember.findMany({
        where: { groupId: mention.groupId },
        select: { userId: true },
      })
      groupMembers.forEach((m) => userIdsToNotify.add(m.userId))

      await prisma.messageMention.create({
        data: {
          messageId: message.id,
          groupId: mention.groupId,
          mentionType: "GROUP",
        },
      })
    }
  }

  // Remove sender from receiving their own notification
  userIdsToNotify.delete(session.user.id)

  // 4. Batch create Notification records
  if (userIdsToNotify.size > 0) {
    await prisma.notification.createMany({
      data: Array.from(userIdsToNotify).map((userId) => ({
        userId,
        messageId: message.id,
        channelId: realChannelId,
      })),
    })
  }

  // 5. Emit real-time WebSocket events via Socket.io getIO()
  try {
    const io = getIO()

    // Emit new-message event to all clients joined to channel room
    io.to(`channel:${realChannelId}`).emit("new-message", message)
    if (channelId !== realChannelId) {
      io.to(`channel:${channelId}`).emit("new-message", message)
    }

    // Emit personal notification event to each mentioned user's room
    for (const notifyUserId of userIdsToNotify) {
      io.to(`user:${notifyUserId}`).emit("notification", {
        messageId: message.id,
        channelId: realChannelId,
        senderName: message.sender.displayName || message.sender.username,
        contentPreview: content.slice(0, 100),
      })
    }

    // Broadcast channel-activity to all channel members/users so sidebars update unread badges
    let recipientUserIds: string[] = []
    if (targetChannel.type === "PUBLIC" || targetChannel.type === "ANNOUNCEMENT") {
      const allActiveUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      recipientUserIds = allActiveUsers.map((u) => u.id)
    } else {
      recipientUserIds = (targetChannel.members || []).map((m) => m.userId)
    }

    for (const recipientId of recipientUserIds) {
      if (recipientId !== session.user.id) {
        io.to(`user:${recipientId}`).emit("channel-activity", {
          channelId: realChannelId,
          senderId: session.user.id,
          messageId: message.id,
        })
      }
    }
  } catch (err) {
    console.error("[Socket.io] Error emitting WebSocket events:", err)
  }

  return NextResponse.json({ message })
}
