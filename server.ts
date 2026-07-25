import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { initSocketServer } from "./src/lib/socket-server"

const dev = process.env.NODE_ENV !== "production"

// next({ dev: true }) manages its own file watching + HMR internally.
// Do NOT use `tsx watch` to run this file — that would restart the whole
// process on every file change and destroy Next.js HMR.
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // Attach Socket.io to the same HTTP server — same port, no CORS issues
  initSocketServer(httpServer)

  httpServer.listen(3000, () => {
    console.log(`> Ready on http://localhost:3000 [${dev ? "dev" : "prod"}]`)
  })
})
