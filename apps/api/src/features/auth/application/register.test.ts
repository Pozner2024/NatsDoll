import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRegister } from './register'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { User } from '@prisma/client'

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
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
}

describe('register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('выбрасывает 409 если email уже занят', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(mockUser)
    const register = makeRegister(mockRepo)
    await expect(register({ name: 'Nat', email: 'nat@test.com', password: 'password123' }))
      .rejects.toMatchObject({ statusCode: 409, message: 'Email already in use' })
  })

  it('хэширует пароль и создаёт пользователя', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser)
    vi.mocked(mockRepo.saveRefreshToken).mockResolvedValue(undefined)

    const register = makeRegister(mockRepo)
    await register({ name: 'Natasha', email: 'nat@test.com', password: 'password123' })

    expect(mockRepo.createUser).toHaveBeenCalledWith({
      name: 'Natasha',
      email: 'nat@test.com',
      passwordHash: 'hashed_password',
    })
  })

  it('сохраняет хэш refresh token, не raw', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser)
    vi.mocked(mockRepo.saveRefreshToken).mockResolvedValue(undefined)

    const register = makeRegister(mockRepo)
    await register({ name: 'Natasha', email: 'nat@test.com', password: 'password123' })

    expect(mockRepo.saveRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'mock_token_hash', userId: 'user1' })
    )
  })

  it('возвращает accessToken, refreshToken и user', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser)
    vi.mocked(mockRepo.saveRefreshToken).mockResolvedValue(undefined)

    const register = makeRegister(mockRepo)
    const result = await register({ name: 'Natasha', email: 'nat@test.com', password: 'password123' })

    expect(result.accessToken).toBe('mock_access_token')
    expect(result.refreshToken).toBe('mock_raw_refresh')
    expect(result.user).toMatchObject({ id: 'user1', email: 'nat@test.com', role: 'CUSTOMER' })
  })
})
