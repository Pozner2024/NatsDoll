// apps/api/src/features/auth/presentation/authRoutes.ts
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { requireAuth } from '../../../shared/middleware/requireAuth'
import { COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '../../../shared/lib/tokens'

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
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

export function makeAuthRouter(
  register: RegisterFn,
  login: LoginFn,
  refreshToken: RefreshTokenFn,
  logout: LogoutFn,
  getMe: GetMeFn,
) {
  const router = new Hono()

  router.post('/register', zValidator('json', registerSchema), async (c) => {
    const data = c.req.valid('json')
    const result = await register(data)
    setCookie(c, COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      path: '/auth',
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
      path: '/auth',
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
      path: '/auth',
      sameSite: 'Strict',
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      secure: isProduction,
    })
    return c.json({ accessToken: result.accessToken })
  })

  router.post('/logout', async (c) => {
    const rawToken = getCookie(c, COOKIE_NAME) ?? ''
    await logout(rawToken)
    deleteCookie(c, COOKIE_NAME, { path: '/auth' })
    return new Response(null, { status: 204 })
  })

  router.get('/me', requireAuth, async (c) => {
    const { userId } = c.get('auth')
    const user = await getMe(userId)
    if (!user) return c.json({ error: 'User not found' }, 404)
    return c.json({ user })
  })

  return router
}
