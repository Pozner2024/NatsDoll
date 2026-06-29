import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeContactRepository } from './contactRepository'

function makePrisma() {
  return {
    contactMessage: { create: vi.fn() },
  } as unknown as Parameters<typeof makeContactRepository>[0]
}

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('contactRepository.create', () => {
  it('сохраняет сообщение обратной связи', async () => {
    vi.mocked(prisma.contactMessage.create).mockResolvedValue({} as never)
    const repo = makeContactRepository(prisma)
    const data = { name: 'Alice', email: 'a@b.co', message: 'Hi' }
    await repo.create(data)
    expect(prisma.contactMessage.create).toHaveBeenCalledWith({ data })
  })
})
