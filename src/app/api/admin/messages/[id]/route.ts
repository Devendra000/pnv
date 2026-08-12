import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Allow if request has valid admin session
  const session = await auth().catch(() => null)
  const isSessionAdmin = session?.user?.role === 'ADMIN'

  // Allow if header matches ADMIN_API_KEY env var
  const adminKey = req.headers.get('x-admin-key')
  const envKey = process.env.ADMIN_API_KEY || null
  const isHeaderAdmin = envKey ? adminKey === envKey : false

  // Deny in production unless authorized
  if (process.env.NODE_ENV === 'production' && !isSessionAdmin && !isHeaderAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isSessionAdmin && !isHeaderAdmin && process.env.NODE_ENV !== 'production') {
    // In non-production, allow but log a warning (developer convenience)
    console.warn('[admin/messages] unauthenticated access to admin endpoint (dev only)')
  }

  const message = await prisma.message.findUnique({
    where: { id },
    include: { sender: true, mentions: true },
  })

  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  return NextResponse.json({ message })
}
