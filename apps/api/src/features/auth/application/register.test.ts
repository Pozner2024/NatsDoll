import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRegister } from './register'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { EmailService } from '../infrastructure/emailService'
import type { User } from '@prisma/client'

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}))

vi.mock('../../../shared/lib/tokens', () => ({
  generateRefreshToken: vi.fn().mockReturnValue('mock_raw_token'),
  hashToken: vi.fn().mockReturnValue('mock_token_hash'),
  EMAIL_VERIFICATION_TTL_MS: 86400000,
}))

const mockUser: User = {
  id: 'user1',
  name: 'Natasha',
  email: 'nat@test.com',
  passwordHash: 'hashed_password',
  googleId: null,
  role: 'CUSTOMER',
  emailVerified: false,
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
  revokeToken: vi.fn(),
  rotateToken: vi.fn(),
  findByGoogleId: vi.fn().mockResolvedValue(null),
  linkGoogleId: vi.fn().mockResolvedValue(null),
  createGoogleUser: vi.fn().mockResolvedValue(null),
  createEmailVerification: vi.fn().mockResolvedValue(undefined),
  findEmailVerification: vi.fn(),
  deleteEmailVerification: vi.fn(),
  finalizeEmailVerification: vi.fn(),
}

const mockEmailService: EmailService = {
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}

describe('register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('выбрасывает 409 если email уже занят', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(mockUser)
    const register = makeRegister(mockRepo, mockEmailService)
    await expect(register({ name: 'Nat', email: 'nat@test.com', password: 'password123' }))
      .rejects.toMatchObject({ statusCode: 409, message: 'Email already in use' })
  })

  it('хэширует пароль и создаёт пользователя', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser)

    const register = makeRegister(mockRepo, mockEmailService)
    await register({ name: 'Natasha', email: 'nat@test.com', password: 'password123' })

    expect(mockRepo.createUser).toHaveBeenCalledWith({
      name: 'Natasha',
      email: 'nat@test.com',
      passwordHash: 'hashed_password',
    })
  })

  it('сохраняет токен верификации с хэшем', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser)

    const register = makeRegister(mockRepo, mockEmailService)
    await register({ name: 'Natasha', email: 'nat@test.com', password: 'password123' })

    expect(mockRepo.createEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user1', tokenHash: 'mock_token_hash' })
    )
  })

  it('отправляет письмо с ссылкой верификации', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser)

    const register = makeRegister(mockRepo, mockEmailService)
    await register({ name: 'Natasha', email: 'nat@test.com', password: 'password123' })

    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
      'nat@test.com',
      expect.stringContaining('mock_raw_token'),
    )
  })

  it('возвращает message без токенов', async () => {
    vi.mocked(mockRepo.findByEmail).mockResolvedValue(null)
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser)

    const register = makeRegister(mockRepo, mockEmailService)
    const result = await register({ name: 'Natasha', email: 'nat@test.com', password: 'password123' })

    expect(result).toEqual({ message: 'Check your email to verify your account' })
  })
})
