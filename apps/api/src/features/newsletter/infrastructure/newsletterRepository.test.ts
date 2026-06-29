import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeNewsletterRepository } from './newsletterRepository'

function makePrisma() {
  return {
    newsletterSubscriber: { upsert: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
  } as unknown as Parameters<typeof makeNewsletterRepository>[0]
}

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('newsletterRepository', () => {
  it('upsertSubscriber апсертит по email без обновления существующего', async () => {
    vi.mocked(prisma.newsletterSubscriber.upsert).mockResolvedValue({} as never)
    const repo = makeNewsletterRepository(prisma)
    await repo.upsertSubscriber('a@b.co')
    expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
      where: { email: 'a@b.co' },
      update: {},
      create: { email: 'a@b.co' },
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

  it('deleteById удаляет по id', async () => {
    vi.mocked(prisma.newsletterSubscriber.delete).mockResolvedValue({} as never)
    const repo = makeNewsletterRepository(prisma)
    await repo.deleteById('s1')
    expect(prisma.newsletterSubscriber.delete).toHaveBeenCalledWith({ where: { id: 's1' } })
  })
})
