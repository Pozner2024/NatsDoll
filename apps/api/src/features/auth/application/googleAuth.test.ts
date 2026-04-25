import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeGoogleAuth } from './googleAuth'
import type { AuthRepository } from '../infrastructure/authRepository'

vi.mock('../../../shared/lib/tokens', () => ({
  signAccessToken: vi.fn().mockResolvedValue('mock_access_token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock_raw_refresh'),
  hashToken: vi.fn().mockReturnValue('mock_token_hash'),
  REFRESH_TOKEN_TTL_MS: 2592000000,
  MAX_ACTIVE_SESSIONS_PER_USER: 5,
}))

const mockUser = { id: 'u1', name: 'Test User', email: 'test@example.com', role: 'CUSTOMER', googleId: 'g1', passwordHash: null, emailVerified: true, createdAt: new Date(), updatedAt: new Date() }

function makeRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    createUser: vi.fn(),
    createUserWithVerification: vi.fn(),
    deleteUser: vi.fn(),
    findByGoogleId: vi.fn().mockResolvedValue(null),
    linkGoogleId: vi.fn().mockResolvedValue(mockUser),
    createGoogleUser: vi.fn().mockResolvedValue(mockUser),
    saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    pruneUserSessions: vi.fn().mockResolvedValue(undefined),
    findTokenByHash: vi.fn(),
    deleteToken: vi.fn(),
    revokeToken: vi.fn(),
    deleteAllUserTokens: vi.fn(),
    rotateToken: vi.fn(),
    createEmailVerification: vi.fn(),
    findEmailVerification: vi.fn(),
    deleteEmailVerification: vi.fn(),
    finalizeEmailVerification: vi.fn(),
    ...overrides,
  }
}

const mockGetGoogleProfile = vi.fn().mockResolvedValue({
  googleId: 'g1',
  email: 'test@example.com',
  name: 'Test User',
})

describe('googleAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('создаёт нового пользователя если не найден ни googleId ни email', async () => {
    const repo = makeRepo()
    const googleAuth = makeGoogleAuth(repo, mockGetGoogleProfile)

    const result = await googleAuth('auth-code')

    expect(repo.createGoogleUser).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      googleId: 'g1',
    })
    expect(result.user.email).toBe('test@example.com')
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('возвращает существующего пользователя найденного по googleId', async () => {
    const repo = makeRepo({ findByGoogleId: vi.fn().mockResolvedValue(mockUser) })
    const googleAuth = makeGoogleAuth(repo, mockGetGoogleProfile)

    const result = await googleAuth('auth-code')

    expect(repo.createGoogleUser).not.toHaveBeenCalled()
    expect(repo.linkGoogleId).not.toHaveBeenCalled()
    expect(result.user.id).toBe('u1')
  })

  it('привязывает googleId к существующему пользователю найденному по email', async () => {
    const repo = makeRepo({
      findByGoogleId: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(mockUser),
    })
    const googleAuth = makeGoogleAuth(repo, mockGetGoogleProfile)

    const result = await googleAuth('auth-code')

    expect(repo.linkGoogleId).toHaveBeenCalledWith('u1', 'g1')
    expect(repo.createGoogleUser).not.toHaveBeenCalled()
    expect(result.user.id).toBe('u1')
  })
})
