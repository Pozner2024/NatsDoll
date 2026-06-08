import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { makeVerifyEmail } from './verifyEmail'
import { hashToken } from '../../../shared/lib'
import type { AuthRepository } from '../infrastructure/authRepository'

const RAW_TOKEN = 'raw-verification-token'

const mockUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'CUSTOMER' as const,
  passwordHash: 'h',
  googleId: null,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findById: vi.fn().mockResolvedValue(mockUser),
    findByEmail: vi.fn(),
    createUser: vi.fn(),
    createUserWithVerification: vi.fn(),
    deleteUser: vi.fn(),
    updateUser: vi.fn(),
    findByGoogleId: vi.fn(),
    linkGoogleId: vi.fn(),
    createGoogleUser: vi.fn(),
    replaceUnverifiedWithGoogleUser: vi.fn(),
    saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    pruneUserSessions: vi.fn().mockResolvedValue(undefined),
    findTokenByHash: vi.fn(),
    deleteToken: vi.fn(),
    revokeToken: vi.fn(),
    deleteAllUserTokens: vi.fn(),
    rotateToken: vi.fn(),
    createEmailVerification: vi.fn(),
    findEmailVerification: vi.fn(),
    deleteEmailVerification: vi.fn().mockResolvedValue(undefined),
    finalizeEmailVerification: vi.fn().mockResolvedValue(undefined),
    replaceEmailVerification: vi.fn(),
    createPasswordReset: vi.fn(),
    findPasswordReset: vi.fn(),
    deletePasswordReset: vi.fn(),
    finalizePasswordReset: vi.fn(),
    ...overrides,
  } as AuthRepository
}

beforeEach(() => vi.clearAllMocks())

describe('verifyEmail', () => {
  it('подтверждает email по валидному токену и выдаёт токены', async () => {
    const repo = makeRepo({
      findEmailVerification: vi.fn().mockResolvedValue({
        id: 'v1',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    })
    const verifyEmail = makeVerifyEmail(repo)
    const result = await verifyEmail(RAW_TOKEN)

    expect(repo.findEmailVerification).toHaveBeenCalledWith(hashToken(RAW_TOKEN))
    expect(repo.finalizeEmailVerification).toHaveBeenCalledWith('u1', 'v1')
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('отклоняет несуществующий/уже использованный токен', async () => {
    const repo = makeRepo({ findEmailVerification: vi.fn().mockResolvedValue(null) })
    const verifyEmail = makeVerifyEmail(repo)
    await expect(verifyEmail(RAW_TOKEN)).rejects.toMatchObject({ statusCode: 400 })
    expect(repo.finalizeEmailVerification).not.toHaveBeenCalled()
  })

  it('отклоняет и удаляет истёкший токен', async () => {
    const repo = makeRepo({
      findEmailVerification: vi.fn().mockResolvedValue({
        id: 'v1',
        userId: 'u1',
        expiresAt: new Date(Date.now() - 60_000),
      }),
    })
    const verifyEmail = makeVerifyEmail(repo)
    await expect(verifyEmail(RAW_TOKEN)).rejects.toMatchObject({ statusCode: 400 })
    expect(repo.deleteEmailVerification).toHaveBeenCalledWith('v1')
    expect(repo.finalizeEmailVerification).not.toHaveBeenCalled()
  })

  it('гонка: токен исчез между проверкой и finalize (P2025) → 400', async () => {
    const repo = makeRepo({
      findEmailVerification: vi.fn().mockResolvedValue({
        id: 'v1',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 60_000),
      }),
      finalizeEmailVerification: vi.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', { code: 'P2025', clientVersion: 'x' }),
      ),
    })
    const verifyEmail = makeVerifyEmail(repo)
    await expect(verifyEmail(RAW_TOKEN)).rejects.toMatchObject({ statusCode: 400 })
  })
})
