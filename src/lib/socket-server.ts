import { Server } from "socket.io"
import { decode } from "next-auth/jwt"
import type { Server as HTTPServer } from "http"

// Global singleton guard — prevents re-initialization on Next.js hot reload.
// Without this, hot reload triggers "cannot attach to closed server" errors.
const globalWithIO = global as typeof globalThis & { _io?: Server }

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}

export function initSocketServer(httpServer: HTTPServer): Server {
  // Return existing instance on hot reload — do not re-attach
  if (globalWithIO._io) return globalWithIO._io

  const io = new Server(httpServer, {
    path: "/api/socketio",   // must match socket-client.ts
    cors: { origin: "*" },
  })

  // JWT auth middleware — verify the Auth.js session cookie on every connection.
  // Cookie name differs by environment:
  //   dev  (HTTP):  authjs.session-token
  //   prod (HTTPS): __Secure-authjs.session-token
  // Both are checked via ?? fallback.
  io.use(async (socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? ""

    const isSecure = !!parseCookieValue(cookieHeader, "__Secure-authjs.session-token")
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token"

    const token = parseCookieValue(cookieHeader, cookieName)

    if (!token) {
      return next(new Error("Unauthorized"))
    }

    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
    })

    if (!decoded?.sub) {
      return next(new Error("Unauthorized"))
    }

    // userId is now server-verified — never trust client-sent identity
    socket.data.userId = decoded.sub as string
    next()
  })

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string

    // Auto-join personal notification room on connect (identity from verified JWT)
    socket.join(`user:${userId}`)

    // Client requests to subscribe to a channel's message stream
    socket.on("join-channel", (channelId: string) => {
      socket.join(`channel:${channelId}`)
    })

    // Client navigates away from a channel
    socket.on("leave-channel", (channelId: string) => {
      socket.leave(`channel:${channelId}`)
    })

    socket.on("disconnect", () => {
      // socket.io automatically removes from all rooms on disconnect
    })
  })

  globalWithIO._io = io
  return io
}

export function getIO(): Server {
  if (!globalWithIO._io) {
    throw new Error(
      "Socket.io server not initialized. Call initSocketServer() first."
    )
  }
  return globalWithIO._io
}
