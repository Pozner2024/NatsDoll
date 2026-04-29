// HTTP-интерфейс модуля аутентификации. Этот файл переводит внешние HTTP-запросы в действия бизнес-логики. Он      
// отвечает за строгую валидацию входящих данных (Zod), защиту от перебора паролей (Rate Limiting) и безопасное
// управление сессиями через HttpOnly куки. Здесь реализованы все способы входа: классическая регистрация с
// подтверждением почты и быстрый вход через Google OAuth

import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { requireAuth, createRateLimiter } from '../../../shared/middleware'
import { COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS, FRONTEND_URL, COMMON_PASSWORDS } from '../../../shared/lib'
import { getGoogleAuthUrl } from '../infrastructure/googleClient'
import type { AuthTokensResult } from '../application/issueTokens'

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string()
    .min(8)
    .max(128)
    .refine(
      (p) => !COMMON_PASSWORDS.has(p.toLowerCase()),
      { message: 'This password is too common, please choose a stronger one' },
    ),
})

const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const isProduction = process.env.NODE_ENV === 'production'

const FIFTEEN_MIN_MS = 15 * 60_000
const ONE_HOUR_MS = 60 * 60_000
const OAUTH_STATE_TTL_SECONDS = 300

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'Strict',
  maxAge: REFRESH_TOKEN_TTL_SECONDS,
  secure: isProduction,
} as const

// sameSite: 'Lax' обязателен — Google делает cross-site redirect на /google/callback,
// при 'Strict' браузер не отправит cookie и OAuth-вход всегда падает с invalid_state.
const OAUTH_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'Lax',
  maxAge: OAUTH_STATE_TTL_SECONDS,
  secure: isProduction,
} as const

const loginLimiter = createRateLimiter({ max: 10, windowMs: FIFTEEN_MIN_MS })
const registerLimiter = createRateLimiter({ max: 5, windowMs: ONE_HOUR_MS })
const verifyEmailLimiter = createRateLimiter({ max: 10, windowMs: FIFTEEN_MIN_MS })
const googleStartLimiter = createRateLimiter({ max: 30, windowMs: FIFTEEN_MIN_MS })
const googleCallbackLimiter = createRateLimiter({ max: 10, windowMs: FIFTEEN_MIN_MS })
const refreshLimiter = createRateLimiter({ max: 30, windowMs: FIFTEEN_MIN_MS })

type AuthUser = AuthTokensResult['user']

type RegisterFn = (data: { name: string; email: string; password: string }) => Promise<{ message: string }>
type VerifyEmailFn = (rawToken: string) => Promise<AuthTokensResult>
type LoginFn = (data: { email: string; password: string }) => Promise<AuthTokensResult>
type RefreshTokenFn = (rawToken: string) => Promise<{ accessToken: string; refreshToken: string }>
type LogoutFn = (rawToken: string) => Promise<void>
type GetMeFn = (userId: string) => Promise<AuthUser | null>
type GoogleAuthFn = (code: string) => Promise<AuthTokensResult>

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

  router.post('/refresh', refreshLimiter.middleware, async (c) => {
    const rawToken = getCookie(c, COOKIE_NAME)
    if (!rawToken) return c.json({ error: 'Missing refresh token' }, 401)
    const result = await refreshToken(rawToken)
    setCookie(c, COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS)
    return c.json({ accessToken: result.accessToken })
  })

  router.post('/logout', async (c) => {
    const rawToken = getCookie(c, COOKIE_NAME) ?? ''
    await logout(rawToken)
    deleteCookie(c, COOKIE_NAME, { path: '/' })
    return c.body(null, 204)
  })

  router.get('/me', requireAuth, async (c) => {
    const { userId } = c.get('auth')
    const user = await getMe(userId)
    if (!user) return c.json({ error: 'User not found' }, 404)
    return c.json({ user })
  })

  router.post('/verify-email', verifyEmailLimiter.middleware, zValidator('json', verifyEmailSchema), async (c) => {
    const { token } = c.req.valid('json')
    const result = await verifyEmail(token)
    setCookie(c, COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS)
    return c.json({ accessToken: result.accessToken, user: result.user })
  })

  router.get('/google', googleStartLimiter.middleware, (c) => {
    const { url, state } = getGoogleAuthUrl()
    setCookie(c, 'oauth_state', state, OAUTH_STATE_COOKIE_OPTIONS)
    return c.redirect(url)
  })

  router.get('/google/callback', googleCallbackLimiter.middleware, async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const storedState = getCookie(c, 'oauth_state')

    deleteCookie(c, 'oauth_state', { path: '/' })

    if (!code) return c.redirect(`${FRONTEND_URL}/auth/callback?error=auth_failed`)
    if (!state || !storedState || state !== storedState) {
      return c.redirect(`${FRONTEND_URL}/auth/callback?error=invalid_state`)
    }

    try {
      const result = await googleAuth(code)
      setCookie(c, COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS)
      return c.redirect(`${FRONTEND_URL}/auth/callback`)
    } catch (err) {
      console.error('Google OAuth callback failed:', err)
      return c.redirect(`${FRONTEND_URL}/auth/callback?error=auth_failed`)
    }
  })

  return router
}
