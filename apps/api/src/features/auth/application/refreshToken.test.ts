import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRefreshToken } from './refreshToken'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { RefreshToken, User } from '@prisma/client'

vi.mock('../../../shared/lib/tokens', () => ({
  signAccessToken: vi.fn().mockResolvedValue('new_access_token'),
  generateRefreshToken: vi.fn().mockReturnValue('new_raw_refresh'),
  hashToken: vi.fn((token: string) => `hash_of_${token}`),
  REFRESH_TOKEN_TTL_MS: 2592000000,
}))

const now = new Date()
const future = new Date(Date.now() + 86400000)
const past = new Date(Date.now() - 86400000)

const validToken: RefreshToken = {
  id: 'token1',
  tokenHash: 'hash_of_raw_token',
  userId: 'user1',
  expiresAt: future,
  revokedAt: null,
  createdAt: now,
}

const mockUser: User = {
  id: 'user1',
  name: 'Natasha',
  email: 'nat@test.com',
  passwordHash: 'hash',
  googleId: null,
  role: 'CUSTOMER',
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
}

const mockRepo: AuthRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  createUser: vi.fn(),
  saveRefreshToken: vi.fn(),
  findTokenByHash: vi.fn(),
  deleteToken: vi.fn(),
  revokeToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
  rotateToken: vi.fn(),
  findByGoogleId: vi.fn().mockResolvedValue(null),
  linkGoogleId: vi.fn().mockResolvedValue(null),
  createGoogleUser: vi.fn().mockResolvedValue(null),
  createEmailVerification: vi.fn(),
  findEmailVerification: vi.fn(),
  deleteEmailVerification: vi.fn(),
  finalizeEmailVerification: vi.fn(),
}

describe('refreshToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('выбрасывает 401 если токен не найден', async () => {
    vi.mocked(mockRepo.findTokenByHash).mockResolvedValue(null)
    const refresh = makeRefreshToken(mockRepo)
    await expect(refresh('unknown_token'))
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid refresh token' })
  })

  it('выбрасывает 401 и отзывает все токены при повторном использовании', async () => {
    vi.mocked(mockRepo.findTokenByHash).mockResolvedValue({ ...validToken, revokedAt: new Date() })
    vi.mocked(mockRepo.revokeAllUserTokens).mockResolvedValue(undefined)
    const refresh = makeRefreshToken(mockRepo)
    await expect(refresh('raw_token'))
      .rejects.toMatchObject({ statusCode: 401, message: 'Token reuse detected' })
    expect(mockRepo.revokeAllUserTokens).toHaveBeenCalledWith('user1')
  })

  it('выбрасывает 401 если токен истёк', async () => {
    vi.mocked(mockRepo.findTokenByHash).mockResolvedValue({ ...validToken, expiresAt: past })
    vi.mocked(mockRepo.deleteToken).mockResolvedValue(undefined)
    const refresh = makeRefreshToken(mockRepo)
    await expect(refresh('raw_token'))
      .rejects.toMatchObject({ statusCode: 401, message: 'Refresh token expired' })
  })

  it('ротирует токен и возвращает новые токены', async () => {
    vi.mocked(mockRepo.findTokenByHash).mockResolvedValue(validToken)
    vi.mocked(mockRepo.findById).mockResolvedValue(mockUser)
    vi.mocked(mockRepo.rotateToken).mockResolvedValue(true)

    const refresh = makeRefreshToken(mockRepo)
    const result = await refresh('raw_token')

    expect(mockRepo.rotateToken).toHaveBeenCalledWith(
      'token1',
      expect.objectContaining({ userId: 'user1', tokenHash: 'hash_of_new_raw_refresh' }),
    )
    expect(result.accessToken).toBe('new_access_token')
    expect(result.refreshToken).toBe('new_raw_refresh')
  })

  it('выбрасывает 401 и отзывает все токены если rotateToken вернул false (race condition)', async () => {
    vi.mocked(mockRepo.findTokenByHash).mockResolvedValue(validToken)
    vi.mocked(mockRepo.findById).mockResolvedValue(mockUser)
    vi.mocked(mockRepo.rotateToken).mockResolvedValue(false)
    vi.mocked(mockRepo.revokeAllUserTokens).mockResolvedValue(undefined)

    const refresh = makeRefreshToken(mockRepo)
    await expect(refresh('raw_token'))
      .rejects.toMatchObject({ statusCode: 401, message: 'Token reuse detected' })
    expect(mockRepo.revokeAllUserTokens).toHaveBeenCalledWith('user1')
  })
})
