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
    const { themeMode, accentColor, backgroundColor } = data

    // Fetch existing preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    })

    const currentPrefs = typeof user?.preferences === "object" && user.preferences !== null 
      ? user.preferences 
      : {}

    const newPrefs = {
      ...currentPrefs,
      ...(themeMode !== undefined && { themeMode }),
      ...(accentColor !== undefined && { accentColor }),
      ...(backgroundColor !== undefined && { backgroundColor }),
    }

    // Save to database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: newPrefs },
    })

    return NextResponse.json({ success: true, preferences: newPrefs })
  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
