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

  if (action === "remove") {
    await prisma.userGroupMember.deleteMany({
      where: { groupId, userId },
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
    return NextResponse.json({ member, action: "added" })
  }
}
