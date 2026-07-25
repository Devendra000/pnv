"use client"

// CLIENT-ONLY — do not import from Server Components, layouts without
// "use client", or Route Handlers. API routes use getIO() from socket-server.ts.
//
// io() runs at module load time and uses browser WebSocket APIs.
// Importing this file server-side will crash the Node.js process.

import { io } from "socket.io-client"

// Singleton — safe to import in multiple client components without
// creating duplicate connections.
export const socket = io({
  path: "/api/socketio",   // must match initSocketServer path
  autoConnect: true,
})
