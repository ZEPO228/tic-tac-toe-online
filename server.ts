// Production server: Next.js + Socket.io on a single port.
// Used on Railway (production). Local dev uses `next dev` + mini-service.
//
// Run with: bun server.ts  (or: node server.js after compilation)
// PORT env var is respected (Railway sets this automatically).

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as IOServer } from 'socket.io'
import { setupSocketIO } from './src/lib/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const hostname = '0.0.0.0'

async function main() {
  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  await app.prepare()

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = parse(req.url || '/', true)
    handle(req, res, parsedUrl)
  })

  const io = new IOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  setupSocketIO(io)

  server.listen(port, hostname, () => {
    console.log(`[server] Listening on http://${hostname}:${port} (Next.js + Socket.io)`)
  })
}

main().catch(err => {
  console.error('[server] Failed to start:', err)
  process.exit(1)
})
