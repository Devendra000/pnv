import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AdminUsersManager } from "@/components/chat/AdminUsersManager"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    redirect("/chat")
  }

  return <AdminUsersManager currentUserId={session.user.id} />
}
