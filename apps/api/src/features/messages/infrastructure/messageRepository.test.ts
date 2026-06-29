import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeMessageRepository } from './messageRepository'
import { AppError } from '../../../shared/errors'

function makePrisma() {
  return {
    message: { findMany: vi.fn(), create: vi.fn() },
    order: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  } as unknown as Parameters<typeof makeMessageRepository>[0]
}

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('messageRepository.findByUser', () => {
  it('маппит сообщения, orderNumber → null без заказа', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      { id: 'm1', text: 'hi', orderId: null, fromAdmin: false, createdAt: new Date('2026-01-01T00:00:00Z'), order: null },
      { id: 'm2', text: 'yo', orderId: 'o1', fromAdmin: true, createdAt: new Date('2026-01-02T00:00:00Z'), order: { orderNumber: 42 } },
    ] as never)
    const repo = makeMessageRepository(prisma)
    const result = await repo.findByUser('u1')
    expect(result[0]!.orderNumber).toBeNull()
    expect(result[1]!.orderNumber).toBe(42)
    expect(result[1]!.fromAdmin).toBe(true)
  })
})

describe('messageRepository.create', () => {
  it('404, если заказ принадлежит другому пользователю', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: 'o1', userId: 'someone-else' } as never)
    const repo = makeMessageRepository(prisma)
    await expect(repo.create('u1', { text: 'x', orderId: 'o1' }))
      .rejects.toThrow(AppError)
    expect(prisma.message.create).not.toHaveBeenCalled()
  })

  it('404, если пользователь не найден', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never)
    const repo = makeMessageRepository(prisma)
    await expect(repo.create('u1', { text: 'x' })).rejects.toThrow('User not found')
  })

  it('создаёт сообщение и возвращает имя/email отправителя', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: 'Alice', email: 'a@b.co' } as never)
    vi.mocked(prisma.message.create).mockResolvedValue({
      id: 'm1', text: 'hello', orderId: null, fromAdmin: false, createdAt: new Date('2026-01-01T00:00:00Z'), order: null,
    } as never)
    const repo = makeMessageRepository(prisma)
    const result = await repo.create('u1', { text: 'hello' })
    expect(result.userName).toBe('Alice')
    expect(result.userEmail).toBe('a@b.co')
    expect(result.message.text).toBe('hello')
  })
})
