import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { timingSafeEqual } from 'node:crypto'
import { requireAuth } from '../../../shared/middleware/requireAuth'
import { createRateLimiter } from '../../../shared/middleware/rateLimit'
import { COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '../../../shared/lib/tokens'
import { getGoogleAuthUrl } from '../infrastructure/googleClient'
import { FRONTEND_URL } from '../../../shared/lib/config'

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

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/api/auth',
  sameSite: 'Strict',
  maxAge: REFRESH_TOKEN_TTL_SECONDS,
  secure: isProduction,
} as const

const FIFTEEN_MIN_MS = 15 * 60_000
const ONE_HOUR_MS = 60 * 60_000

const loginLimiter = createRateLimiter({ max: 10, windowMs: FIFTEEN_MIN_MS })
const registerLimiter = createRateLimiter({ max: 5, windowMs: ONE_HOUR_MS })
const verifyEmailLimiter = createRateLimiter({ max: 10, windowMs: FIFTEEN_MIN_MS })
const googleCallbackLimiter = createRateLimiter({ max: 10, windowMs: FIFTEEN_MIN_MS })

function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

type AuthUser = { id: string; name: string; email: string; role: string }
type AuthTokens = { accessToken: string; refreshToken: string; user: AuthUser }

type RegisterFn = (data: { name: string; email: string; password: string }) => Promise<{ message: string }>
type VerifyEmailFn = (rawToken: string) => Promise<AuthTokens>
type LoginFn = (data: { email: string; password: string }) => Promise<AuthTokens>
type RefreshTokenFn = (rawToken: string) => Promise<{ accessToken: string; refreshToken: string }>
type LogoutFn = (rawToken: string) => Promise<void>
type GetMeFn = (userId: string) => Promise<AuthUser | null>
type GoogleAuthFn = (code: string) => Promise<AuthTokens>

export function makeAuthRouter(
  register: RegisterFn,
  login: LoginFn,
  refreshToken: RefreshTokenFn,
  logout: LogoutFn,
  getMe: GetMeFn,
  googleAuth: GoogleAuthFn,
  verifyEmail: VerifyEmailFn,
) {
  const router = new Hono()

  router.post('/register', registerLimiter.middleware, zValidator('json', registerSchema), async (c) => {
    const data = c.req.valid('json')
    const result = await register(data)
    return c.json(result, 202)
  })

  router.post('/login', loginLimiter.middleware, zValidator('json', loginSchema), async (c) => {
    const data = c.req.valid('json')
    const result = await login(data)
    setCookie(c, COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS)
    return c.json({ accessToken: result.accessToken, user: result.user })
  })

  router.post('/refresh', async (c) => {
    const rawToken = getCookie(c, COOKIE_NAME)
    if (!rawToken) return c.json({ error: 'Missing refresh token' }, 401)
    const result = await refreshToken(rawToken)
    setCookie(c, COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS)
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

  router.get('/verify-email', verifyEmailLimiter.middleware, async (c) => {
    const token = c.req.query('token')
    if (!token) return c.json({ error: 'Missing token' }, 400)
    const result = await verifyEmail(token)
    setCookie(c, COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS)
    return c.json({ accessToken: result.accessToken, user: result.user })
  })

  router.get('/google', (c) => {
    const { url, state } = getGoogleAuthUrl()
    setCookie(c, 'oauth_state', state, {
      httpOnly: true,
      path: '/',
      sameSite: 'Lax',
      maxAge: 300,
      secure: isProduction,
    })
    return c.redirect(url)
  })

  router.get('/google/callback', googleCallbackLimiter.middleware, async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const storedState = getCookie(c, 'oauth_state')

    deleteCookie(c, 'oauth_state', { path: '/' })

    if (!code) return c.redirect(`${FRONTEND_URL}/auth/callback?error=auth_failed`)
    if (!state || !storedState || !safeStringEqual(state, storedState)) {
      return c.redirect(`${FRONTEND_URL}/auth/callback?error=invalid_state`)
    }

    try {
      const result = await googleAuth(code)
      setCookie(c, COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS)
      return c.redirect(`${FRONTEND_URL}/auth/callback#token=${result.accessToken}`)
    } catch (err) {
      console.error('Google OAuth callback failed:', err)
      return c.redirect(`${FRONTEND_URL}/auth/callback?error=auth_failed`)
    }
  })

  return router
}
