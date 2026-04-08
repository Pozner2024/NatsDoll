import { serve } from '@hono/node-server'
import { createApp } from './app'
import { prisma } from './shared/infrastructure'

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL env variable is required in production')
}

const port = Number(process.env.PORT || 3000)

const app = createApp()

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`)
})

async function shutdown() {
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

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
