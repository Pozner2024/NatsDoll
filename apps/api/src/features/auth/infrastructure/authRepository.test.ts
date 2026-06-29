import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAuthRepository } from './authRepository'

function makePrisma() {
  const prisma = {
    refreshToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[]),
    ),
  }
  return prisma as unknown as Parameters<typeof makeAuthRepository>[0] & typeof prisma
}

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('authRepository.pruneUserSessions', () => {
  it('чистит revoked и оставляет только maxActive самых свежих', async () => {
    vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([
      { id: 't1' }, { id: 't2' }, { id: 't3' },
    ] as never)
    const repo = makeAuthRepository(prisma)
    await repo.pruneUserSessions('u1', 1)

    // 1-й deleteMany — revoked-токены
    expect(prisma.refreshToken.deleteMany).toHaveBeenNthCalledWith(1, { where: { userId: 'u1', revokedAt: { not: null } } })
    // 2-й deleteMany — лишние активные сверх maxActive (t2, t3)
    expect(prisma.refreshToken.deleteMany).toHaveBeenNthCalledWith(2, { where: { id: { in: ['t2', 't3'] } } })
  })

  it('не удаляет активные, если их не больше maxActive', async () => {
    vi.mocked(prisma.refreshToken.findMany).mockResolvedValue([{ id: 't1' }] as never)
    const repo = makeAuthRepository(prisma)
    await repo.pruneUserSessions('u1', 3)
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1) // только revoked
  })
})

describe('authRepository.rotateToken', () => {
  it('возвращает false и не создаёт новый токен при reuse (count === 0)', async () => {
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 0 } as never)
    const repo = makeAuthRepository(prisma)
    const ok = await repo.rotateToken('old', { userId: 'u1', tokenHash: 'h', expiresAt: new Date() })
    expect(ok).toBe(false)
    expect(prisma.refreshToken.create).not.toHaveBeenCalled()
  })

  it('отзывает старый и создаёт новый при успехе (count === 1)', async () => {
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never)
    const repo = makeAuthRepository(prisma)
    const newData = { userId: 'u1', tokenHash: 'h', expiresAt: new Date() }
    const ok = await repo.rotateToken('old', newData)
    expect(ok).toBe(true)
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({ data: newData })
  })
})
