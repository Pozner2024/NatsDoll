import { Hono } from 'hono'
import { cors } from 'hono/cors'

export function createApp() {
  const app = new Hono()

  // CORS must be first middleware
  app.use('*', cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  return app
}
