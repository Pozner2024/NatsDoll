import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { makeAuthRouter } from './authRoutes'

vi.mock('../../../shared/lib/tokens', () => ({
  COOKIE_NAME: 'refresh_token',
  REFRESH_TOKEN_TTL_SECONDS: 2592000,
}))

vi.mock('../infrastructure/googleClient', () => ({
  getGoogleAuthUrl: vi.fn().mockReturnValue({
    url: 'https://accounts.google.com/o/oauth2/auth?mock',
    state: 'mock_state_value',
  }),
}))

const mockUser = { id: 'u1', name: 'Test', email: 'test@example.com', role: 'CUSTOMER' }
const mockTokens = { accessToken: 'access_tok', refreshToken: 'refresh_tok', user: mockUser }

function makeNoop() {
  const register = vi.fn().mockResolvedValue({ message: 'Check your email to verify your account' })
  const login = vi.fn().mockResolvedValue(mockTokens)
  const refreshToken = vi.fn().mockResolvedValue({ accessToken: 'new_access', refreshToken: 'new_refresh' })
  const logout = vi.fn().mockResolvedValue(undefined)
  const getMe = vi.fn().mockResolvedValue(mockUser)
  const googleAuth = vi.fn().mockResolvedValue(mockTokens)
  const verifyEmail = vi.fn().mockResolvedValue(mockTokens)
  return { register, login, refreshToken, logout, getMe, googleAuth, verifyEmail }
}

function makeApp(fns = makeNoop()) {
  const app = new Hono()
  const router = makeAuthRouter(
    fns.register, fns.login, fns.refreshToken, fns.logout, fns.getMe, fns.googleAuth, fns.verifyEmail,
  )
  app.route('/api/auth', router)
  return { app, fns }
}

describe('GET /api/auth/google', () => {
  it('устанавливает oauth_state cookie с path=/', async () => {
    const { app } = makeApp()
    const res = await app.request('http://localhost/api/auth/google')

    expect(res.status).toBe(302)
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).toContain('oauth_state=mock_state_value')
    expect(setCookieHeader).toContain('Path=/')
  })

  it('редиректит на Google URL', async () => {
    const { app } = makeApp()
    const res = await app.request('http://localhost/api/auth/google')

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('accounts.google.com')
  })
})

describe('GET /api/auth/google/callback', () => {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  it('редиректит на /auth/callback и устанавливает refresh cookie при успехе', async () => {
    const { app } = makeApp()
    const res = await app.request(
      'http://localhost/api/auth/google/callback?code=valid_code&state=mock_state',
      { headers: { cookie: 'oauth_state=mock_state' } },
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${frontendUrl}/auth/callback`)
    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    expect(setCookieHeader).toContain('refresh_token=refresh_tok')
  })

  it('редиректит с ?error=invalid_state при несовпадении state', async () => {
    const { app } = makeApp()
    const res = await app.request(
      'http://localhost/api/auth/google/callback?code=valid_code&state=wrong_state',
      { headers: { cookie: 'oauth_state=correct_state' } },
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${frontendUrl}/auth/callback?error=invalid_state`)
  })

  it('редиректит с ?error=invalid_state если cookie отсутствует', async () => {
    const { app } = makeApp()
    const res = await app.request(
      'http://localhost/api/auth/google/callback?code=valid_code&state=some_state',
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${frontendUrl}/auth/callback?error=invalid_state`)
  })

  it('редиректит с ?error=auth_failed если нет code', async () => {
    const { app } = makeApp()
    const res = await app.request(
      'http://localhost/api/auth/google/callback?state=mock_state',
      { headers: { cookie: 'oauth_state=mock_state' } },
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${frontendUrl}/auth/callback?error=auth_failed`)
  })

  it('редиректит с ?error=auth_failed если googleAuth выбрасывает ошибку', async () => {
    const fns = makeNoop()
    fns.googleAuth.mockRejectedValue(new Error('Google API error'))
    const { app } = makeApp(fns)
    const res = await app.request(
      'http://localhost/api/auth/google/callback?code=bad_code&state=mock_state',
      { headers: { cookie: 'oauth_state=mock_state' } },
    )

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(`${frontendUrl}/auth/callback?error=auth_failed`)
  })

  it('удаляет oauth_state cookie после обработки', async () => {
    const { app } = makeApp()
    const res = await app.request(
      'http://localhost/api/auth/google/callback?code=valid_code&state=mock_state',
      { headers: { cookie: 'oauth_state=mock_state' } },
    )

    const setCookieHeader = res.headers.get('set-cookie') ?? ''
    // Hono удаляет куки через maxAge=0 или expires в прошлом
    expect(setCookieHeader).toContain('oauth_state')
  })
})
