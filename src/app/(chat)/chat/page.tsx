import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function ChatIndexPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const firstChannel = await prisma.channel.findFirst({
    where: {
      OR: [
        { type: "PUBLIC" },
        { type: "ANNOUNCEMENT" },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  })

  const targetSlug = firstChannel?.slug || "general"
  redirect(`/chat/${targetSlug}`)
}
