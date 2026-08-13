import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import Link from "next/link"
import { MessageSquare, ArrowLeft } from "lucide-react"

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const session = await auth()
  if (!session) return notFound()

  const { username } = await params
  
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      role: true,
      createdAt: true
    }
  })

  if (!user) return notFound()

  const isSelf = session.user.id === user.id

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 md:p-10">
          <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Header / Cover Area */}
            <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5"></div>
            
            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
                {/* Avatar */}
                <div className="w-32 h-32 rounded-2xl border-4 border-card bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-slate-400">
                      {(user.displayName || user.username)[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {!isSelf && (
                    <Link 
                      href={`/dm/${user.username}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-lg shadow-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Link>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {user.displayName || user.username}
                  </h1>
                  <p className="text-base text-muted-foreground mt-1 font-medium">
                    @{user.username}
                  </p>
                </div>

                {user.bio && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-border">
                      {user.bio}
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-border flex items-center gap-6 text-sm text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">Joined: </span>
                    {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Role: </span>
                    <span className="capitalize">{user.role.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
