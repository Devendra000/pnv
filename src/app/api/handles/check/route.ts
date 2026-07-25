import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// Ultra-fast in-memory cache for sub-millisecond handle lookups
const handleCache = new Map<string, { available: boolean; reason?: string; name?: string; ts: number }>()
const CACHE_TTL = 15000 // 15 seconds TTL

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const handle = (searchParams.get("handle") || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "")
  const excludeUserId = searchParams.get("excludeUserId")

  if (!handle) {
    return NextResponse.json({ available: false, reason: "empty" })
  }

  const cacheKey = `${handle}:${excludeUserId || ""}`
  const cached = handleCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ available: cached.available, reason: cached.reason, name: cached.name })
  }

  // Fast O(1) parallel B-Tree index queries
  const [existingGroup, existingUser] = await Promise.all([
    prisma.userGroup.findUnique({
      where: { handle },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { username: handle },
      select: { id: true, displayName: true, username: true },
    }),
  ])

  if (existingGroup) {
    const result = { available: false, reason: "group", name: existingGroup.name }
    handleCache.set(cacheKey, { ...result, ts: Date.now() })
    return NextResponse.json(result)
  }

  if (existingUser && (!excludeUserId || existingUser.id !== excludeUserId)) {
    const result = {
      available: false,
      reason: "user",
      name: existingUser.displayName || existingUser.username,
    }
    handleCache.set(cacheKey, { ...result, ts: Date.now() })
    return NextResponse.json(result)
  }

  const result = { available: true }
  handleCache.set(cacheKey, { ...result, ts: Date.now() })
  return NextResponse.json(result)
}
