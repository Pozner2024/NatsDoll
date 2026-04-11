import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prisma } from './shared/infrastructure'
import { AppError } from './shared/errors'
import { makeGalleryRepository, makeGetHomeGallery, makeGalleryRouter } from './features/gallery'
import {
  makeNewsletterRepository,
  makeSubscribe,
  makeNewsletterRouter,
} from './features/newsletter'

export function createApp() {
  const app = new Hono()

  app.use('*', cors({
    origin: process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.statusCode as 400 | 401 | 403 | 404 | 422 | 500)
    }
    console.error('Unhandled error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  // Gallery
  const galleryRepo = makeGalleryRepository(prisma)
  const getHomeGallery = makeGetHomeGallery(galleryRepo)
  app.route('/gallery', makeGalleryRouter(getHomeGallery))

  // Newsletter
  const newsletterRepo = makeNewsletterRepository(prisma)
  const subscribe = makeSubscribe(newsletterRepo)
  app.route('/newsletter', makeNewsletterRouter(subscribe))

  return app
}
