import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.preferences) token.preferences = session.preferences
        if (session.bio !== undefined) token.bio = session.bio
        if (session.displayName !== undefined) token.displayName = session.displayName
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl
      }

      if (user) {
        token.role = (user as any).role
        token.username = (user as any).username
        token.userId = user.id
        token.displayName = (user as any).displayName
        token.avatarUrl = (user as any).avatarUrl
        token.bio = (user as any).bio
      }
      
      if (token.userId) {
        const { prisma } = await import("@/lib/prisma")
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string }
        })
        if (!dbUser) {
          return null // Destroy token if user doesn't exist
        }
        token.preferences = dbUser.preferences || {}
        token.bio = dbUser.bio
        token.displayName = dbUser.displayName
        token.avatarUrl = dbUser.avatarUrl
        token.username = dbUser.username
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.role = token.role as string
        session.user.username = token.username as string
        session.user.id = token.userId as string
        ;(session.user as any).preferences = token.preferences || {}
        ;(session.user as any).bio = token.bio
        ;(session.user as any).displayName = token.displayName
        ;(session.user as any).avatarUrl = token.avatarUrl
      }
      return session
    },
  },
} satisfies NextAuthConfig
