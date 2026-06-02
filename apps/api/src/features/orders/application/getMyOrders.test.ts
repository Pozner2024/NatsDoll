import { describe, it, expect, vi } from 'vitest'
import { makeGetMyOrders } from './getMyOrders'
import type { OrderRepository } from '../types'

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
  }
}

describe('getMyOrders', () => {
  it('delegates to repo.getMyOrders', async () => {
    const repo = makeRepo()
    const expected = [
      { id: 'o1', orderNumber: 1, status: 'PENDING', totalAmount: 30, itemCount: 2,
        createdAt: '2026-05-21T00:00:00.000Z', firstItemImage: null },
    ]
    vi.mocked(repo.getMyOrders).mockResolvedValue(expected)
    const getMyOrders = makeGetMyOrders(repo)
    const result = await getMyOrders('u1')
    expect(result).toEqual(expected)
    expect(repo.getMyOrders).toHaveBeenCalledWith('u1')
  })

  it('returns empty array when user has no orders', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getMyOrders).mockResolvedValue([])
    const getMyOrders = makeGetMyOrders(repo)
    const result = await getMyOrders('u1')
    expect(result).toEqual([])
  })
})
