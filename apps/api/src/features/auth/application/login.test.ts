import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeLogin } from './login'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { User } from '@prisma/client'

vi.mock('@node-rs/argon2', () => ({
  verify: vi.fn(),
}))

vi.mock('../../../shared/lib/tokens', () => ({
  signAccessToken: vi.fn().mockResolvedValue('mock_access_token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock_raw_refresh'),
  hashToken: vi.fn().mockReturnValue('mock_token_hash'),
  REFRESH_TOKEN_TTL_MS: 2592000000,
}))

const mockUser: User = {
  id: 'user1',
  name: 'Natasha',
  email: 'nat@test.com',
  passwordHash: 'hashed_password',
  googleId: null,
  role: 'CUSTOMER',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRepo: AuthRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  createUser: vi.fn(),
  saveRefreshToken: vi.fn(),
  findTokenByHash: vi.fn(),
  deleteToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
  findByGoogleId: vi.fn().mockResolvedValue(null),
  linkGoogleId: vi.fn().mockResolvedValue(null),
  createGoogleUser: vi.fn().mockResolvedValue(null),
  revokeToken: vi.fn().mockResolvedValue(undefined),
}

describe('login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('выбрасывает 401 если пользователь не найден', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    const login = makeLogin(mockRepo)
    await expect(login({ email: 'nobody@test.com', password: 'pass' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('выбрасывает 401 если пароль неверный', async () => {
    const { verify } = await import('@node-rs/argon2')
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(mockUser)
    vi.mocked(verify).mockResolvedValue(false)
    const login = makeLogin(mockRepo)
    await expect(login({ email: 'nat@test.com', password: 'wrong' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('выбрасывает 401 если у пользователя нет passwordHash (Google аккаунт)', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue({ ...mockUser, passwordHash: null })
    const login = makeLogin(mockRepo)
    await expect(login({ email: 'nat@test.com', password: 'pass' }))
      .rejects.toMatchObject({ statusCode: 401, message: 'Use Google login' })
  })

  it('возвращает токены при правильных данных', async () => {
    const { verify } = await import('@node-rs/argon2')
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(mockUser)
    vi.mocked(verify).mockResolvedValue(true)
    vi.mocked(mockRepo.saveRefreshToken).mockResolvedValue(undefined)

    const login = makeLogin(mockRepo)
    const result = await login({ email: 'nat@test.com', password: 'password123' })

    expect(result.accessToken).toBe('mock_access_token')
    expect(result.refreshToken).toBe('mock_raw_refresh')
    expect(result.user.email).toBe('nat@test.com')
  })
})
