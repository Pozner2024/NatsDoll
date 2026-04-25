import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeLogout } from './logout'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { RefreshToken } from '@prisma/client'

vi.mock('../../../shared/lib/tokens', () => ({
  hashToken: vi.fn((token: string) => `hash_of_${token}`),
}))

const storedToken: RefreshToken = {
  id: 'token1',
  tokenHash: 'hash_of_valid_token',
  userId: 'user1',
  expiresAt: new Date(Date.now() + 86400000),
  revokedAt: null,
  createdAt: new Date(),
}

const mockRepo: AuthRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  createUser: vi.fn(),
  createUserWithVerification: vi.fn(),
  deleteUser: vi.fn(),
  saveRefreshToken: vi.fn(),
  pruneUserSessions: vi.fn(),
  findTokenByHash: vi.fn(),
  deleteToken: vi.fn(),
  deleteAllUserTokens: vi.fn(),
  findByGoogleId: vi.fn().mockResolvedValue(null),
  linkGoogleId: vi.fn().mockResolvedValue(null),
  createGoogleUser: vi.fn().mockResolvedValue(null),
  revokeToken: vi.fn().mockResolvedValue(undefined),
  rotateToken: vi.fn(),
  createEmailVerification: vi.fn(),
  findEmailVerification: vi.fn(),
  deleteEmailVerification: vi.fn(),
  finalizeEmailVerification: vi.fn(),
}

describe('logout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('удаляет токен из БД', async () => {
    vi.mocked(mockRepo.findTokenByHash).mockResolvedValue(storedToken)
    vi.mocked(mockRepo.deleteToken).mockResolvedValue(undefined)
    const logout = makeLogout(mockRepo)
    await logout('valid_token')
    expect(mockRepo.deleteToken).toHaveBeenCalledWith('token1')
  })

  it('идемпотентен если токен не найден', async () => {
    vi.mocked(mockRepo.findTokenByHash).mockResolvedValue(null)
    const logout = makeLogout(mockRepo)
    await expect(logout('unknown_token')).resolves.toBeUndefined()
    expect(mockRepo.deleteToken).not.toHaveBeenCalled()
  })

  it('идемпотентен если токен пустой', async () => {
    const logout = makeLogout(mockRepo)
    await expect(logout('')).resolves.toBeUndefined()
    expect(mockRepo.findTokenByHash).not.toHaveBeenCalled()
  })
})
