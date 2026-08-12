import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = (searchParams.get("q") || "").toLowerCase().trim()

  const companies = await prisma.company.findMany({
    where: query
      ? {
          OR: [
            { englishName: { contains: query, mode: "insensitive" } },
            { nepaliName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    select: { id: true, englishName: true },
    take: 10,
  })

  const suggestions = companies.map((c) => {
    // Replace spaces with hyphens to ensure valid mention handles
    const handle = c.englishName.replace(/\s+/g, "-")
    return {
      id: c.id,
      label: handle,
      handle: handle,
      type: "company",
    }
  })

  return NextResponse.json({ suggestions })
}
