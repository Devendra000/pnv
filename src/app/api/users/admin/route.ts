import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { username, email, password, displayName, role } = await req.json()

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
  }

  const cleanUsername = username.toLowerCase().trim()

  // Check if username is taken by a User Group handle
  const existingGroup = await prisma.userGroup.findUnique({
    where: { handle: cleanUsername },
  })
  if (existingGroup) {
    return NextResponse.json(
      { error: `Username @${cleanUsername} is already taken by a User Group.` },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: cleanUsername }, { email: email.toLowerCase().trim() }] },
  })

  if (existing) {
    return NextResponse.json({ error: "User with this username or email already exists" }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      username: cleanUsername,
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      displayName: displayName || cleanUsername,
      role: role === "ADMIN" ? "ADMIN" : "USER",
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ user })
}
