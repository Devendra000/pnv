import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") || ""
  const excludeSelf = searchParams.get("excludeSelf") === "true"

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(excludeSelf ? { id: { not: session.user.id } } : {}),
      ...(query
        ? {
            OR: [
              { username: { contains: query, mode: "insensitive" } },
              { displayName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
    },
    take: 50,
    orderBy: { username: "asc" },
  })

  return NextResponse.json({ users })
}
