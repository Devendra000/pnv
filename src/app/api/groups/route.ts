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

  const existing = await prisma.userGroup.findUnique({ where: { handle: groupHandle } })
  if (existing) {
    return NextResponse.json({ error: "Group handle already exists" }, { status: 400 })
  }

  const group = await prisma.userGroup.create({
    data: {
      name,
      handle: groupHandle,
      createdById: session.user.id,
    },
  })

  return NextResponse.json({ group })
}
