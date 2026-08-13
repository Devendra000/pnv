import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { displayName, username, email, bio, avatarUrl } = data

    // Check if username/email is taken by another user
    if (username || email) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
          ],
          NOT: {
            id: session.user.id
          }
        }
      })
      if (existing) {
        if (existing.username === username) {
          return NextResponse.json({ error: "Username already taken" }, { status: 400 })
        }
        if (existing.email === email) {
          return NextResponse.json({ error: "Email already taken" }, { status: 400 })
        }
      }
    }

    const updateData: any = {}
    if (displayName !== undefined) updateData.displayName = displayName
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (bio !== undefined) updateData.bio = bio
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

    // Save to database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
