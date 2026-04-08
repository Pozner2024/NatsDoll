import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prisma } from './shared/infrastructure'
import { makeGalleryRepository, makeGetHomeGallery, makeGalleryRouter } from './features/gallery'

export function createApp() {
  const app = new Hono()

  app.use('*', cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL!.replace(/\/$/, '')
      : 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  // Gallery
  const galleryRepo = makeGalleryRepository(prisma)
  const getHomeGallery = makeGetHomeGallery(galleryRepo)
  app.route('/gallery', makeGalleryRouter(getHomeGallery))

  return app
}
