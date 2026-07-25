import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") || ""

  const groups = await prisma.userGroup.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { handle: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { name, handle } = await req.json()

  if (!name || !handle) {
    return NextResponse.json({ error: "Group name and handle are required" }, { status: 400 })
  }

  const groupHandle = handle.toLowerCase().replace(/[^a-z0-9]/g, "")

  // Check if handle is taken by an existing user group
  const existingGroup = await prisma.userGroup.findUnique({ where: { handle: groupHandle } })
  if (existingGroup) {
    return NextResponse.json({ error: `Group handle @${groupHandle} already exists.` }, { status: 400 })
  }

  // Check if handle is taken by an existing user username
  const existingUser = await prisma.user.findFirst({
    where: { username: { equals: groupHandle, mode: "insensitive" } },
  })
  if (existingUser) {
    return NextResponse.json(
      { error: `Handle @${groupHandle} is already taken by a workspace user.` },
      { status: 400 }
    )
  }

  const group = await prisma.userGroup.create({
    data: {
      name,
      handle: groupHandle,
      createdById: session.user.id,
    },
  })

  // Create corresponding private Channel for this User Group so members can communicate
  const channelSlug = `group-${groupHandle}`
  await prisma.channel.upsert({
    where: { slug: channelSlug },
    update: { name: `@${groupHandle}` },
    create: {
      name: `@${groupHandle}`,
      slug: channelSlug,
      type: "PRIVATE",
      description: `Group discussion channel for ${name} (@${groupHandle})`,
      createdById: session.user.id,
      members: {
        create: {
          userId: session.user.id,
        },
      },
    },
  })

  return NextResponse.json({ group })
}
