import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AdminGroupsManager } from "@/components/chat/AdminGroupsManager"

export default async function AdminGroupsPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    redirect("/chat")
  }

  return <AdminGroupsManager />
}
