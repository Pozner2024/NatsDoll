import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createUser } from './factories'
import { makeAuthRepository } from '../../src/features/auth/infrastructure/authRepository'

const prisma = makeTestPrisma()
const repo = makeAuthRepository(prisma)

beforeAll(async () => { await prisma.$connect() })
afterAll(async () => { await prisma.$disconnect() })
beforeEach(async () => { await truncateAll(prisma) })

describe('authRepository.resetUnverifiedRegistration (integration)', () => {
  it('overwrites name+passwordHash and replaces the pending verification atomically', async () => {
    const user = await createUser(prisma, {
      emailVerified: false,
      passwordHash: 'attacker-hash',
      name: 'Attacker',
    })
    await prisma.emailVerification.create({
      data: { userId: user.id, tokenHash: 'old-token-hash', expiresAt: new Date(Date.now() + 3_600_000) },
    })

    await repo.resetUnverifiedRegistration(user.id, {
      name: 'Real Owner',
      passwordHash: 'owner-hash',
      verification: { tokenHash: 'new-token-hash', expiresAt: new Date(Date.now() + 3_600_000) },
    })

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(after.passwordHash).toBe('owner-hash')
    expect(after.name).toBe('Real Owner')
    expect(after.emailVerified).toBe(false)

    const verifications = await prisma.emailVerification.findMany({ where: { userId: user.id } })
    expect(verifications).toHaveLength(1)
    expect(verifications[0]?.tokenHash).toBe('new-token-hash')
  })
})
