# Chat System — Implementation Plan (Final)

## Overview

Implementing a Slack-like internal chat system into **pnv-document-generator** (Next.js 16 / Prisma 7 / PostgreSQL).

**Real-time transport: Socket.io WebSockets** — self-hosted, no third-party service.

---

## User Review Required

> [!IMPORTANT]
> **`pnpm dev` command changes.** Dev script changes from `next dev` → `tsx server.ts`. Next.js manages its own HMR internally — `tsx watch` is NOT used (it would kill HMR).

> [!WARNING]
> **Auth middleware will protect all routes** after this. `/dashboard`, `/companies`, etc. will require login. Default credentials: `admin` / `admin123` (from seed).

> [!NOTE]
> **Existing models and code are untouched.** New Prisma models are appended below existing ones.

---

## Proposed Changes

---

### Task 1 — Packages

```bash
pnpm add next-auth@beta @auth/prisma-adapter bcryptjs \
  @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-mention @tiptap/extension-placeholder tippy.js \
  socket.io socket.io-client

pnpm add -D @types/bcryptjs
```

No Pusher packages.

---

### Task 2 — Environment Variables

#### [MODIFY] [.env](file:///c:/Users/L%20E%20N%20O%20V%20O/Desktop/office/veshraj.com/pnv-document-generator/.env)

```env
# Auth
AUTH_SECRET=<generate: openssl rand -base64 32>
AUTH_URL=http://localhost:3000
```

No Pusher vars.

---

### Task 3 — package.json Scripts

#### [MODIFY] [package.json](file:///c:/Users/L%20E%20N%20O%20V%20O/Desktop/office/veshraj.com/pnv-document-generator/package.json)

```json
"scripts": {
  "dev":   "tsx server.ts",
  "build": "next build",
  "start": "NODE_ENV=production tsx server.ts",
  "lint":  "eslint"
}
```

**Why `tsx server.ts` (not `tsx watch server.ts`):**  
`tsx watch` restarts the whole Node process on any file change, which kills Next.js's built-in HMR. Using plain `tsx server.ts` lets Next handle its own file watching internally via `next({ dev: true })`.

**Why `tsx` for production start:**  
`next build` outputs to `.next/`, not `dist/`. Compiling `server.ts` separately adds complexity. For this internal tool, `tsx server.ts` in production is clean and sufficient.

---

### Task 4 — Custom Next.js Server

#### [NEW] server.ts (project root)

```ts
import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { initSocketServer } from "./src/lib/socket-server"

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })          // Next handles its own HMR in dev mode
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  initSocketServer(httpServer)   // attach Socket.io to the same HTTP server

  httpServer.listen(3000, () => {
    console.log("> Ready on http://localhost:3000")
  })
})
```

---

### Task 5 — Socket.io Server Utility

#### [NEW] src/lib/socket-server.ts

**Key design decisions:**

**1. Global singleton guard** — prevents re-initialization on Next.js hot reload:
```ts
const globalWithIO = global as typeof globalThis & { _io?: Server }

export function initSocketServer(httpServer: HTTPServer) {
  if (globalWithIO._io) return globalWithIO._io   // already initialized
  const io = new Server(httpServer, {
    path: "/api/socketio",    // must match client
    cors: { origin: "*" },
  })
  globalWithIO._io = io
  // ...attach event handlers
  return io
}

export function getIO(): Server {
  if (!globalWithIO._io) throw new Error("Socket.io not initialized")
  return globalWithIO._io
}
```

Without this guard, hot reload triggers "cannot attach to closed server" errors in dev.

**2. JWT auth middleware on Socket.io handshake** — do NOT trust client-sent `userId`:
```ts
// Exact import — from next-auth/jwt, not next-auth
import { decode } from "next-auth/jwt"

io.use(async (socket, next) => {
  // Read the Auth.js session token from the cookie header
  const cookie = socket.handshake.headers.cookie ?? ""

  // Cookie name differs between environments:
  //   dev  (HTTP):  authjs.session-token
  //   prod (HTTPS): __Secure-authjs.session-token
  // Both must be checked — the ?? fallback handles this correctly.
  const token = parseCookieValue(cookie, "authjs.session-token")
    ?? parseCookieValue(cookie, "__Secure-authjs.session-token")

  if (!token) return next(new Error("Unauthorized"))

  const decoded = await decode({ token, secret: process.env.AUTH_SECRET! })
  if (!decoded?.sub) return next(new Error("Unauthorized"))

  socket.data.userId = decoded.sub as string   // trusted, server-verified user ID
  next()
})
```

This prevents any client from impersonating another user by sending `socket.emit("identify", someOtherUserId)`.

**3. Events server → client:**

| Event | Room | Payload |
|---|---|---|
| `new-message` | `channel:{channelId}` | full message object |
| `notification` | `user:{userId}` | `{ messageId, channelId, senderName }` |
| `message-edited` | `channel:{channelId}` | updated message |
| `message-deleted` | `channel:{channelId}` | `{ messageId }` |

**4. Events client → server:**

| Event | Action |
|---|---|
| `join-channel` | `socket.join("channel:{channelId}")` |
| `leave-channel` | `socket.leave("channel:{channelId}")` |
| `connection` | Auto-joins `user:{socket.data.userId}` room (from verified JWT) |

No `identify` event — user identity comes from the verified JWT only.

#### [NEW] src/lib/socket-client.ts

```ts
import { io } from "socket.io-client"

// Singleton — safe to import anywhere in client components
export const socket = io({
  path: "/api/socketio",    // must match server
  autoConnect: true,
})
```

> [!CAUTION]
> **`socket-client.ts` is client-only.** `io()` runs at module load time and uses browser APIs. Importing it in a Server Component or API Route Handler will crash the server.
> - Add `"use client"` to **every component** that imports `socket-client.ts` or `useSocket.ts`.
> - **Never** import either file from Server Components, layouts with no `"use client"`, or Route Handlers.
> - API routes emit events via `getIO()` (server-side Socket.io instance) — never via `socket-client.ts`.

#### [NEW] src/hooks/useSocket.ts

React hook that subscribes/unsubscribes per-channel and handles cleanup. File must begin with `"use client"`.

---

### Task 6 — Prisma Schema

#### [MODIFY] [schema.prisma](file:///c:/Users/L%20E%20N%20O%20V%20O/Desktop/office/veshraj.com/pnv-document-generator/prisma/schema.prisma)

Append below all existing models:

**Enums:** `UserRole`, `ChannelType`, `MentionType`, `NotifPref`

**Auth.js required models:** `User`, `Account`, `Session`, `VerificationToken`

**Chat models:** `Channel`, `ChannelMember`, `Message` (thread support via `parentId`), `MessageMention`, `Notification`, `UserGroup`, `UserGroupMember`

Then run:
```bash
pnpm prisma migrate dev --name add-chat-system
```

#### [NEW] prisma/seed.ts

Seeds admin user (`admin` / `admin123`) + `#general` PUBLIC channel.

```bash
pnpm prisma db seed
```

---

### Task 7 — Auth.js

#### [NEW] src/auth.ts
NextAuth v5, Credentials provider, JWT strategy, PrismaAdapter. Attaches `role`, `username`, `userId` to JWT token and session.

#### [NEW] src/app/api/auth/[...nextauth]/route.ts
Auth.js handler: `export const { GET, POST } = handlers`

#### [NEW] src/types/next-auth.d.ts
Extends `Session.user` with `id: string`, `role: string`, `username: string`.

---

### Task 8 — Middleware

#### [NEW] src/middleware.ts

```ts
import { auth } from "@/auth"
// - /api/auth/* → always allow
// - /login → allow unauthenticated, redirect authenticated to /dashboard
// - everything else → redirect unauthenticated to /login
```

---

### Task 9 — Mention Parser

#### [NEW] src/lib/mention-parser.ts

Parses `@username`, `@channel`, `@here`, `@everyone`, `@grouphandle`. Returns typed `ParsedMention[]`. Called server-side in the message POST handler.

---

### Task 10 — API Routes

All under `src/app/api/`. Real-time events emitted via `getIO().to(...).emit(...)`.

| Route | Methods | Purpose |
|---|---|---|
| `channels/route.ts` | GET, POST | List / create channels |
| `channels/[channelId]/route.ts` | GET | Single channel |
| `channels/[channelId]/members/route.ts` | GET, POST | Members / join |
| `channels/[channelId]/read/route.ts` | POST | Update `lastReadAt` |
| `messages/route.ts` | POST | Save → parse mentions → create notifications → emit WS |
| `messages/[channelId]/route.ts` | GET | Paginated history (`?cursor=`, `?limit=50`) |
| `notifications/route.ts` | GET, PATCH | User notifications / mark-read |
| `users/route.ts` | GET | All users (`?q=` for mention autocomplete) |
| `users/admin/route.ts` | POST | Admin create user (role guard) |
| `groups/route.ts` | GET, POST | User groups |
| `groups/[groupId]/members/route.ts` | POST | Add/remove members |

No Pusher auth route.

---

### Task 11 — Login Page

#### [NEW] src/app/login/page.tsx

Full-page login form (username + password). No Navbar/Sidebar. Calls:
```ts
signIn("credentials", { username, password, redirectTo: "/chat" })
```

---

### Task 12 — Chat Pages & Route Group

**The `(chat)` route group owns ALL `/chat/*` and `/admin/*` routes.**

#### [DELETE] [src/app/(app)/chat/page.tsx](file:///c:/Users/L%20E%20N%20O%20V%20O/Desktop/office/veshraj.com/pnv-document-generator/src/app/(app)/chat/page.tsx)

Deleted entirely — not redirected — to avoid Next.js route conflicts. Both route groups can match `/chat/*` if both directories exist. `(chat)` takes sole ownership.

```
src/app/(chat)/
├── layout.tsx                 ← Auth check + ChatLayout (no Navbar/Sidebar)
├── chat/
│   ├── page.tsx               ← Redirect to /chat/{first-channel-slug}
│   └── [channelId]/
│       └── page.tsx           ← Main message view
├── dm/
│   └── [username]/
│       └── page.tsx           ← DM thread
└── admin/
    ├── users/
    │   └── page.tsx           ← Admin: list + create users
    └── groups/
        └── page.tsx           ← Admin: manage user groups
```

---

### Task 13 — Chat Components

```
src/components/chat/
├── ChatLayout.tsx          ← Full-screen: channel sidebar + main panel
├── ChannelSidebar.tsx      ← Channels by type, unread badges
├── MessageList.tsx         ← Scrollable feed; socket.on("new-message")
├── MessageBubble.tsx       ← Avatar, sender, timestamp, content
├── MessageInput.tsx        ← Tiptap editor with @mention
├── mentionSuggestion.ts    ← Tiptap suggestion config (GET /api/users?q=)
├── MentionSuggestions.tsx  ← Autocomplete dropdown renderer
├── ThreadPanel.tsx         ← Thread reply panel (parentId messages)
├── NotificationBell.tsx    ← Bell + unread badge
└── ChannelHeader.tsx       ← Channel name, description, member count
```

**`MessageList.tsx` subscription pattern:**
```ts
useEffect(() => {
  socket.emit("join-channel", channelId)
  socket.on("new-message", (data) => setMessages(prev => [...prev, data]))
  return () => {
    socket.emit("leave-channel", channelId)
    socket.off("new-message")
  }
}, [channelId])
```

---

## Verification Plan

### Automated
```bash
pnpm prisma migrate dev --name add-chat-system
pnpm prisma db seed
pnpm build
```

### Manual
1. `pnpm dev` starts cleanly via `tsx server.ts`
2. HMR works — editing a component hot-reloads without server restart
3. `http://localhost:3000` → `/login`
4. Login `admin` / `admin123` → `/chat` → `#general`
5. Two tabs open → send message → instant delivery via WebSocket
6. Type `@` → autocomplete dropdown appears
7. `@mention` a user → notification bell increments
8. `/admin/users` → create a new user (role guard enforced)
