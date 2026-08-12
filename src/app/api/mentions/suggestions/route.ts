import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const channelId = searchParams.get("channelId") || ""
  const query = (searchParams.get("q") || "").toLowerCase().trim()

  let targetChannel: any = null

  if (channelId) {
    targetChannel = await prisma.channel.findFirst({
      where: { OR: [{ id: channelId }, { slug: channelId }] },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    })
  }

  const totalWorkspaceMembers = await prisma.user.count({ where: { isActive: true } })
  const channelMembersCount = targetChannel ? targetChannel.members.length : totalWorkspaceMembers

  // If channel is PUBLIC, `@everyone` should represent all active workspace users;
  // otherwise it makes more sense to show the channel membership count.
  const everyoneCount = targetChannel?.type === "PUBLIC" ? totalWorkspaceMembers : channelMembersCount

  // 1. Direct Message (DM) - Only recipient username
  if (targetChannel?.type === "DM") {
    const recipientMember = targetChannel.members.find((m: any) => m.userId !== session.user.id)
    if (!recipientMember) return NextResponse.json({ suggestions: [] })

    const recipientUser = recipientMember.user
    if (
      query &&
      !recipientUser.username.toLowerCase().includes(query) &&
      !(recipientUser.displayName || "").toLowerCase().includes(query)
    ) {
      return NextResponse.json({ suggestions: [] })
    }

    return NextResponse.json({
      suggestions: [
        {
          id: recipientUser.id,
          label: recipientUser.username,
          handle: recipientUser.username,
          type: "user",
        },
      ],
    })
  }

  // 2. User Group Channel (slug starts with "group-") - Group members + special broadcast mentions (@everyone, @here, @channel)
  if (targetChannel?.slug?.startsWith("group-")) {
    const specialMentions = [
      { id: "channel", label: "channel", handle: "channel", type: "group" as const, memberCount: channelMembersCount },
      { id: "here", label: "here", handle: "here", type: "group" as const, memberCount: channelMembersCount },
      { id: "everyone", label: "everyone", handle: "everyone", type: "group" as const, memberCount: everyoneCount },
    ].filter((m) => m.label.toLowerCase().includes(query))

    const groupMembers = (targetChannel.members || [])
      .filter((m: any) => m.userId !== session.user.id)
      .map((m: any) => ({
        id: m.user.id,
        label: m.user.username,
        handle: m.user.username,
        type: "user" as const,
      }))
      .filter((u: any) => u.label.toLowerCase().includes(query))

    return NextResponse.json({
      suggestions: [...specialMentions, ...groupMembers].slice(0, 10),
    })
  }

  // 3. Regular Public / Private Channel - Channel members + User Groups + special broadcast mentions (@everyone, @here, @channel)
  const specialMentions = [
    { id: "channel", label: "channel", handle: "channel", type: "group" as const, memberCount: channelMembersCount },
    { id: "here", label: "here", handle: "here", type: "group" as const, memberCount: channelMembersCount },
    { id: "everyone", label: "everyone", handle: "everyone", type: "group" as const, memberCount: everyoneCount },
  ].filter((m) => m.label.toLowerCase().includes(query))

  let userMembers: any[] = []
  if (targetChannel) {
    userMembers = targetChannel.members
      // Exclude the current user from the suggestions by default so typing @ doesn't suggest yourself.
      // If you'd like to include the current user in the list, remove the `.filter` below.
      .filter((m: any) => m.userId !== session.user.id)
      .map((m: any) => ({
        id: m.user.id,
        label: m.user.username,
        handle: m.user.username,
        type: "user" as const,
      }))
      .filter((u: any) => u.label.toLowerCase().includes(query))
  } else {
    const allUsers = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        isActive: true,
        ...(query
          ? {
              OR: [
                { username: { contains: query, mode: "insensitive" } },
                { displayName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: { id: true, username: true },
      take: 10,
    })
    userMembers = allUsers.map((u) => ({
      id: u.id,
      label: u.username,
      handle: u.username,
      type: "user" as const,
    }))
  }

  const userGroups = await prisma.userGroup.findMany({
    where: query ? { handle: { contains: query, mode: "insensitive" } } : {},
    select: {
      id: true,
      handle: true,
      _count: { select: { members: true } },
    },
    take: 10,
  })

  const groupSuggestions = userGroups.map((g) => ({
    id: g.id,
    label: g.handle,
    handle: g.handle,
    type: "group" as const,
    memberCount: g._count?.members || 0,
  }))

  return NextResponse.json({
    suggestions: [...specialMentions, ...userMembers, ...groupSuggestions].slice(0, 10),
  })
}
