import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeNewsletterRepository } from './newsletterRepository'

function makePrisma() {
  return {
    newsletterSubscriber: { upsert: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  } as unknown as Parameters<typeof makeNewsletterRepository>[0]
}

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('newsletterRepository', () => {
  it('upsertSubscriber апсертит по email и возвращает строку', async () => {
    const row = { id: '1', email: 'a@b.co', subscribedAt: new Date(), confirmedAt: null }
    vi.mocked(prisma.newsletterSubscriber.upsert).mockResolvedValue(row as never)
    const repo = makeNewsletterRepository(prisma)
    const result = await repo.upsertSubscriber('a@b.co')
    expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
      where: { email: 'a@b.co' },
      update: {},
      create: { email: 'a@b.co' },
    })
    expect(result).toBe(row)
  })

  it('confirmByEmail проставляет confirmedAt (идемпотентно, updateMany)', async () => {
    vi.mocked(prisma.newsletterSubscriber.updateMany).mockResolvedValue({} as never)
    const repo = makeNewsletterRepository(prisma)
    await repo.confirmByEmail('a@b.co')
    expect(prisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
      where: { email: 'a@b.co' },
      data: { confirmedAt: expect.any(Date) },
    })
  })

  it('getAll сортирует по subscribedAt desc', async () => {
    const subs = [{ id: '1', email: 'a@b.co', subscribedAt: new Date() }]
    vi.mocked(prisma.newsletterSubscriber.findMany).mockResolvedValue(subs as never)
    const repo = makeNewsletterRepository(prisma)
    const result = await repo.getAll()
    expect(prisma.newsletterSubscriber.findMany).toHaveBeenCalledWith({ orderBy: { subscribedAt: 'desc' } })
    expect(result).toBe(subs)
  })

  it('deleteById удаляет по id (идемпотентно)', async () => {
    vi.mocked(prisma.newsletterSubscriber.deleteMany).mockResolvedValue({} as never)
    const repo = makeNewsletterRepository(prisma)
    await repo.deleteById('s1')
    expect(prisma.newsletterSubscriber.deleteMany).toHaveBeenCalledWith({ where: { id: 's1' } })
  })

  it('deleteByEmail удаляет по email (идемпотентно)', async () => {
    vi.mocked(prisma.newsletterSubscriber.deleteMany).mockResolvedValue({} as never)
    const repo = makeNewsletterRepository(prisma)
    await repo.deleteByEmail('a@b.co')
    expect(prisma.newsletterSubscriber.deleteMany).toHaveBeenCalledWith({ where: { email: 'a@b.co' } })
  })
})
