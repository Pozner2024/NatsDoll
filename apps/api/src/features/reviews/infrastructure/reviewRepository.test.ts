import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeReviewRepository } from './reviewRepository'

function makePrisma() {
  return {
    review: { findMany: vi.fn(), create: vi.fn() },
    order: { findMany: vi.fn() },
  } as unknown as Parameters<typeof makeReviewRepository>[0]
}

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('reviewRepository.findReviewableItems', () => {
  it('берёт товары из DELIVERED-заказов, исключая уже отревьюенные', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      {
        id: 'o1',
        items: [
          { productId: 'p1', product: { id: 'p1', name: 'A', images: ['a.jpg'] } },
          { productId: 'p2', product: { id: 'p2', name: 'B', images: [] } },
        ],
      },
    ] as never)
    // p1 уже отревьюен → должен отсеяться
    vi.mocked(prisma.review.findMany).mockResolvedValue([{ productId: 'p1' }] as never)

    const repo = makeReviewRepository(prisma)
    const result = await repo.findReviewableItems('u1')

    expect(result).toEqual([
      { productId: 'p2', productName: 'B', productImage: null, orderId: 'o1' },
    ])
    // фильтр по статусу DELIVERED
    const where = vi.mocked(prisma.order.findMany).mock.calls[0]![0]!.where
    expect(where).toMatchObject({ userId: 'u1', status: 'DELIVERED' })
  })

  it('пустой список, когда нет доставленных заказов', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.review.findMany).mockResolvedValue([] as never)
    const repo = makeReviewRepository(prisma)
    expect(await repo.findReviewableItems('u1')).toEqual([])
  })
})

describe('reviewRepository.findMyReviews', () => {
  it('маппит отзывы с названием товара и первым изображением', async () => {
    vi.mocked(prisma.review.findMany).mockResolvedValue([
      { id: 'r1', productId: 'p1', orderId: 'o1', rating: 5, comment: 'nice', createdAt: new Date('2026-01-01T00:00:00Z'), product: { name: 'A', images: ['a.jpg'] } },
    ] as never)
    const repo = makeReviewRepository(prisma)
    const result = await repo.findMyReviews('u1')
    expect(result).toEqual([
      { id: 'r1', productId: 'p1', productName: 'A', productImage: 'a.jpg', orderId: 'o1', rating: 5, comment: 'nice', createdAt: '2026-01-01T00:00:00.000Z' },
    ])
  })
})
