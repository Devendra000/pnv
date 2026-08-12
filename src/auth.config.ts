import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.username = (user as any).username
        token.userId = user.id
      }
      
      if (token.userId) {
        const { prisma } = await import("@/lib/prisma")
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string }
        })
        if (!dbUser) {
          return null // Destroy token if user doesn't exist
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.role = token.role as string
        session.user.username = token.username as string
        session.user.id = token.userId as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
