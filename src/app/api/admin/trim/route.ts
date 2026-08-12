import { NextRequest, NextResponse } from 'next/server'
import trimTrailingEmptyBlocks from '@/lib/trimTiptap'
import { auth } from '@/auth'

async function isAdmin(req: NextRequest) {
  const session = await auth().catch(() => null)
  if (session?.user?.role === 'ADMIN') return true
  const adminKey = req.headers.get('x-admin-key')
  const envKey = process.env.ADMIN_API_KEY || null
  if (envKey && adminKey === envKey) return true
  // Allow in development for convenience
  if (process.env.NODE_ENV !== 'production') return true
  return false
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !body.contentParsed) {
    return NextResponse.json({ error: 'Missing contentParsed in body' }, { status: 400 })
  }

  const cleaned = trimTrailingEmptyBlocks(body.contentParsed)
  return NextResponse.json({ cleaned })
}
