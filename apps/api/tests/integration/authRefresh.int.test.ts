import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createUser } from './factories'
import { makeAuthRepository } from '../../src/features/auth/infrastructure/authRepository'
import { makeRefreshToken } from '../../src/features/auth/application/refreshToken'
import { generateRefreshToken, hashToken, REFRESH_TOKEN_TTL_MS } from '../../src/shared/lib'

const prisma = makeTestPrisma()
const repo = makeAuthRepository(prisma)

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await truncateAll(prisma)
})

async function seedUserWithToken() {
  const user = await createUser(prisma)
  const raw = generateRefreshToken()
  await repo.saveRefreshToken({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  })
  return { userId: user.id, raw }
}

describe('refresh-token rotation (integration)', () => {
  it('wipes all sessions when a revoked (reused) refresh token is presented', async () => {
    const refreshToken = makeRefreshToken(repo)
    const { userId, raw } = await seedUserWithToken()

    // Первый refresh — успешная ротация (старый токен отзывается, выдаётся новый).
    const rotated = await refreshToken(raw)
    expect(rotated.accessToken).toBeTruthy()

    // Повторное использование старого (отозванного) токена = reuse-detection.
    await expect(refreshToken(raw)).rejects.toMatchObject({ statusCode: 401 })

    // Все refresh-токены пользователя удалены.
    const count = await prisma.refreshToken.count({ where: { userId } })
    expect(count).toBe(0)
  })

  it('lets exactly one of two concurrent rotations of the same token succeed', async () => {
    const { raw } = await seedUserWithToken()
    const stored = await repo.findTokenByHash(hashToken(raw))
    expect(stored).not.toBeNull()

    const newData = {
      userId: stored!.userId,
      tokenHash: hashToken(generateRefreshToken()),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    }
    const newData2 = {
      userId: stored!.userId,
      tokenHash: hashToken(generateRefreshToken()),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    }

    const [a, b] = await Promise.all([
      repo.rotateToken(stored!.id, newData),
      repo.rotateToken(stored!.id, newData2),
    ])

    // CAS на revokedAt: ровно одна ротация выигрывает.
    expect([a, b].filter(Boolean)).toHaveLength(1)
  })
})
