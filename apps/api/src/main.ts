import { serve } from '@hono/node-server'
import { createApp } from './app'
import { prisma, cleanupExpiredAuthRecords } from './shared/infrastructure'

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL env variable is required in production')
}

const SHUTDOWN_TIMEOUT_MS = 10_000
const CLEANUP_INTERVAL_MS = 24 * 60 * 60_000

const port = Number(process.env.PORT || 3000)
const app = createApp()

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`)
})

void cleanupExpiredAuthRecords(prisma)
const cleanupTimer = setInterval(() => void cleanupExpiredAuthRecords(prisma), CLEANUP_INTERVAL_MS)
cleanupTimer.unref()

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`Received ${signal}, shutting down gracefully...`)

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  await new Promise<void>((resolve) => server.close(() => resolve()))
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('uncaughtException', async (err) => {
  console.error('Uncaught exception:', err)
  await prisma.$disconnect()
  process.exit(1)
})

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason)
  await prisma.$disconnect()
  process.exit(1)
})
