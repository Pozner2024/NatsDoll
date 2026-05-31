import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateReview } from './createReview'
import { AppError } from '../../../shared/errors'

const repo = {
  findMyReviews: vi.fn(),
  findReviewableItems: vi.fn(),
  create: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('createReview', () => {
  it('creates review for delivered order item', async () => {
    repo.findReviewableItems.mockResolvedValue([
      { productId: 'p1', orderId: 'o1', productName: 'Ring', productImage: null },
    ])
    repo.create.mockResolvedValue({
      id: 'r1', productId: 'p1', productName: 'Ring', productImage: null,
      orderId: 'o1', rating: 5, comment: null, createdAt: new Date().toISOString(),
    })

    const createReview = makeCreateReview(repo as any)
    const result = await createReview('u1', { productId: 'p1', orderId: 'o1', rating: 5 })

    expect(repo.create).toHaveBeenCalledWith('u1', { productId: 'p1', orderId: 'o1', rating: 5, comment: undefined })
    expect(result.id).toBe('r1')
  })

  it('throws 400 if product/order not in reviewable items', async () => {
    repo.findReviewableItems.mockResolvedValue([])

    const createReview = makeCreateReview(repo as any)
    await expect(
      createReview('u1', { productId: 'p1', orderId: 'o1', rating: 5 }),
    ).rejects.toThrow(AppError)
  })

  it('throws 400 if rating out of range', async () => {
    const createReview = makeCreateReview(repo as any)
    await expect(
      createReview('u1', { productId: 'p1', orderId: 'o1', rating: 6 }),
    ).rejects.toThrow(AppError)
  })
})
