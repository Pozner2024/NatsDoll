// apps/api/src/features/auth/presentation/authRoutes.ts
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { requireAuth } from '../../../shared/middleware/requireAuth'
import { COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '../../../shared/lib/tokens'
import { getGoogleAuthUrl } from '../infrastructure/googleClient'

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(1).max(128),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const isProduction = process.env.NODE_ENV === 'production'

type RegisterFn = (data: { name: string; email: string; password: string }) => Promise<{
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}>

type LoginFn = (data: { email: string; password: string }) => Promise<{
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}>

type RefreshTokenFn = (rawToken: string) => Promise<{
  accessToken: string
  refreshToken: string
}>

type LogoutFn = (rawToken: string) => Promise<void>

type GetMeFn = (userId: string) => Promise<{
  id: string; name: string; email: string; role: string
} | null>

type GoogleAuthFn = (code: string) => Promise<{
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string }
}>

export function makeAuthRouter(
  register: RegisterFn,
  login: LoginFn,
  refreshToken: RefreshTokenFn,
  logout: LogoutFn,
  getMe: GetMeFn,
  googleAuth: GoogleAuthFn,
) {
  const router = new Hono()

  router.post('/register', zValidator('json', registerSchema), async (c) => {
    const data = c.req.valid('json')
    const result = await register(data)
    setCookie(c, COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'Strict',
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      secure: isProduction,
    })
    return c.json({ accessToken: result.accessToken, user: result.user }, 201)
  })

  router.post('/login', zValidator('json', loginSchema), async (c) => {
    const data = c.req.valid('json')
    const result = await login(data)
    setCookie(c, COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'Strict',
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      secure: isProduction,
    })
    return c.json({ accessToken: result.accessToken, user: result.user })
  })

  router.post('/refresh', async (c) => {
    const rawToken = getCookie(c, COOKIE_NAME)
    if (!rawToken) return c.json({ error: 'Missing refresh token' }, 401)
    const result = await refreshToken(rawToken)
    setCookie(c, COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'Strict',
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      secure: isProduction,
    })
    return c.json({ accessToken: result.accessToken })
  })

  router.post('/logout', async (c) => {
    const rawToken = getCookie(c, COOKIE_NAME) ?? ''
    await logout(rawToken)
    deleteCookie(c, COOKIE_NAME, { path: '/api/auth' })
    return c.body(null, 204)
  })

  router.get('/me', requireAuth, async (c) => {
    const { userId } = c.get('auth')
    const user = await getMe(userId)
    if (!user) return c.json({ error: 'User not found' }, 404)
    return c.json({ user })
  })

  router.get('/google', (c) => {
    const { url, state } = getGoogleAuthUrl()
    setCookie(c, 'oauth_state', state, {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'Lax',
      maxAge: 300,
      secure: isProduction,
    })
    return c.redirect(url)
  })

  router.get('/google/callback', async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const storedState = getCookie(c, 'oauth_state')

    deleteCookie(c, 'oauth_state', { path: '/api/auth' })

    if (!code) return c.json({ error: 'Missing code' }, 400)
    if (!state || !storedState || state !== storedState) {
      return c.json({ error: 'Invalid state' }, 400)
    }

    const result = await googleAuth(code)
    setCookie(c, COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'Strict',
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      secure: isProduction,
    })

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    return c.redirect(`${frontendUrl}/auth/callback#token=${result.accessToken}`)
  })

  return router
}
