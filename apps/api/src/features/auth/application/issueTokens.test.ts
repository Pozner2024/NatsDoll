import { describe, it, expect, vi, beforeEach } from 'vitest'
import { issueTokensForUser } from './issueTokens'
import {
  hashToken,
  verifyAccessToken,
  MAX_ACTIVE_SESSIONS_PER_USER,
  REFRESH_TOKEN_TTL_MS,
} from '../../../shared/lib'

const mockUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'CUSTOMER' as const,
  passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$abc$def',
  googleId: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const repo = {
  saveRefreshToken: vi.fn(),
  pruneUserSessions: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('issueTokensForUser', () => {
  it('сохраняет HMAC-хэш refresh-токена, а не сырой токен', async () => {
    const before = Date.now()
    const result = await issueTokensForUser(repo as any, mockUser as any)

    expect(repo.saveRefreshToken).toHaveBeenCalledTimes(1)
    const arg = repo.saveRefreshToken.mock.calls[0][0]
    expect(arg.userId).toBe('u1')
    expect(arg.tokenHash).toBe(hashToken(result.refreshToken))
    expect(arg.tokenHash).not.toBe(result.refreshToken)
    expect(arg.expiresAt.getTime()).toBeGreaterThanOrEqual(before + REFRESH_TOKEN_TTL_MS)
  })

  it('подрезает старые сессии до лимита', async () => {
    await issueTokensForUser(repo as any, mockUser as any)
    expect(repo.pruneUserSessions).toHaveBeenCalledWith('u1', MAX_ACTIVE_SESSIONS_PER_USER)
  })

  it('выдаёт валидный access-токен с sub и role', async () => {
    const result = await issueTokensForUser(repo as any, mockUser as any)
    const payload = await verifyAccessToken(result.accessToken)
    expect(payload.sub).toBe('u1')
    expect(payload.role).toBe('CUSTOMER')
  })

  it('возвращает публичный объект пользователя без passwordHash', async () => {
    const result = await issueTokensForUser(repo as any, mockUser as any)
    expect(result.user).toEqual({ id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'CUSTOMER' })
    expect(result.user).not.toHaveProperty('passwordHash')
  })
})
