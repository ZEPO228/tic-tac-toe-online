// Production server: Next.js + Socket.io on a single port.

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as IOServer } from 'socket.io'
import { setupSocketIO } from './src/lib/socket-server'
import { execSync } from 'child_process'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const hostname = '0.0.0.0'

async function main() {
  // Push Prisma schema to database (creates tables if they don't exist)
  if (!dev && process.env.DATABASE_URL) {
    try {
      console.log('[server] Pushing Prisma schema to database...')
      execSync('npx prisma db push --accept-data-loss 2>&1 || true', { stdio: 'inherit', env: process.env })
      console.log('[server] Database schema push attempted')
    } catch (e) {
      console.error('[server] Failed to push schema (continuing anyway):', e)
    }
  }

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
