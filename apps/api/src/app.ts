import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { prisma } from './shared/infrastructure'
import { AppError } from './shared/errors'
import { makeGalleryRepository, makeGetHomeGallery, makeGalleryRouter } from './features/gallery'
import {
  makeNewsletterRepository,
  makeSubscribe,
  makeNewsletterRouter,
} from './features/newsletter'
import { makeContactRepository, makeSubmit, makeContactRouter } from './features/contact'
import {
  makeAuthRepository,
  makeRegister,
  makeLogin,
  makeRefreshToken,
  makeLogout,
  makeGetMe,
  makeGoogleAuth,
  makeGetGoogleProfile,
  makeAuthRouter,
  makeVerifyEmail,
  makeEmailService,
} from './features/auth'

export function createApp() {
  const app = new Hono()

  const frontendOrigin = process.env.FRONTEND_URL
    ? new URL(process.env.FRONTEND_URL).origin
    : 'http://localhost:5173'

  app.use('*', secureHeaders())

  app.use('*', cors({
    origin: frontendOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.statusCode)
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

  // Contact
  const contactRepo = makeContactRepository(prisma)
  const submit = makeSubmit(contactRepo)
  app.route('/contact', makeContactRouter(submit))

  // Auth
  const authRepo = makeAuthRepository(prisma)
  const emailService = makeEmailService()
  const register = makeRegister(authRepo, emailService)
  const login = makeLogin(authRepo)
  const refreshToken = makeRefreshToken(authRepo)
  const logout = makeLogout(authRepo)
  const getMe = makeGetMe(authRepo)
  const getGoogleProfile = makeGetGoogleProfile()
  const googleAuth = makeGoogleAuth(authRepo, getGoogleProfile)
  const verifyEmail = makeVerifyEmail(authRepo)
  app.route('/auth', makeAuthRouter(register, login, refreshToken, logout, getMe, googleAuth, verifyEmail))

  return app
}
