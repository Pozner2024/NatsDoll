import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeGetReviewableItems } from './getReviewableItems'

const repo = {
  findReviewableItems: vi.fn(),
  create: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('getReviewableItems', () => {
  it('возвращает список доступных для отзыва товаров пользователя', async () => {
    const items = [
      { productId: 'p1', productName: 'Doll', productImage: null, orderId: 'o1' },
    ]
    repo.findReviewableItems.mockResolvedValue(items)
    const getReviewableItems = makeGetReviewableItems(repo as any)

    const result = await getReviewableItems('u1')

    expect(repo.findReviewableItems).toHaveBeenCalledWith('u1')
    expect(result).toEqual(items)
  })

  it('возвращает пустой список, когда отзывов оставить не на что', async () => {
    repo.findReviewableItems.mockResolvedValue([])
    const getReviewableItems = makeGetReviewableItems(repo as any)

    expect(await getReviewableItems('u1')).toEqual([])
  })
})
