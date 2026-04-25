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
  MAX_ACTIVE_SESSIONS_PER_USER: 5,
}))

const mockUser: User = {
  id: 'user1',
  name: 'Natasha',
  email: 'nat@test.com',
  passwordHash: 'hashed_password',
  googleId: null,
  role: 'CUSTOMER',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
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
  revokeToken: vi.fn(),
  rotateToken: vi.fn(),
  findByGoogleId: vi.fn().mockResolvedValue(null),
  linkGoogleId: vi.fn().mockResolvedValue(null),
  createGoogleUser: vi.fn().mockResolvedValue(null),
  createEmailVerification: vi.fn(),
  findEmailVerification: vi.fn(),
  deleteEmailVerification: vi.fn(),
  finalizeEmailVerification: vi.fn(),
}

describe('login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('выбрасывает 401 если пользователь не найден', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    const login = makeLogin(mockRepo)
    await expect(login({ email: 'nobody@test.com', password: 'pass' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('вызывает verify даже если пользователя нет (защита от timing attack)', async () => {
    const { verify } = await import('@node-rs/argon2')
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(verify).mockResolvedValue(false)
    const login = makeLogin(mockRepo)
    await expect(login({ email: 'nobody@test.com', password: 'pass' }))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(verify).toHaveBeenCalledTimes(1)
    const [hash] = vi.mocked(verify).mock.calls[0]!
    expect(hash).toMatch(/^\$argon2id\$/)
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
      .rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' })
  })

  it('вызывает verify с dummy hash для Google-only аккаунта (защита от timing attack)', async () => {
    const { verify } = await import('@node-rs/argon2')
    vi.mocked(mockRepo.findByEmail).mockResolvedValue({ ...mockUser, passwordHash: null })
    vi.mocked(verify).mockResolvedValue(false)
    const login = makeLogin(mockRepo)
    await expect(login({ email: 'nat@test.com', password: 'pass' })).rejects.toBeDefined()
    expect(verify).toHaveBeenCalledTimes(1)
    const [hash] = vi.mocked(verify).mock.calls[0]!
    expect(hash).toMatch(/^\$argon2id\$/)
  })

  it('выбрасывает 403 если email не подтверждён', async () => {
    const { verify } = await import('@node-rs/argon2')
    vi.mocked(mockRepo.findByEmail).mockResolvedValue({ ...mockUser, emailVerified: false })
    vi.mocked(verify).mockResolvedValue(true)
    const login = makeLogin(mockRepo)
    await expect(login({ email: 'nat@test.com', password: 'password123' }))
      .rejects.toMatchObject({ statusCode: 403, message: 'Please verify your email before signing in' })
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
