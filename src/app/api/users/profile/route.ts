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

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user is trying to change their username
    if (username && username !== currentUser.username) {
      return NextResponse.json({ error: "Username cannot be changed" }, { status: 400 })
    }

    // Check if email is changing and if the new email is already taken
    if (email && email !== currentUser.email) {
      const existing = await prisma.user.findUnique({
        where: { email }
      })
      if (existing) {
        return NextResponse.json({ error: "Email already taken" }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (displayName !== undefined) updateData.displayName = displayName
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
