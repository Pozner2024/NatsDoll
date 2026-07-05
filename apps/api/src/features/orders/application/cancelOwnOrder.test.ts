import { describe, it, expect, vi } from 'vitest'
import { makeCancelOwnOrder } from './cancelOwnOrder'
import type { OrderRepository } from '../types'

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    createOrderFromItems: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
    getProductsForCheckout: vi.fn(),
    cancelPendingOrder: vi.fn(),
  }
}

describe('cancelOwnOrder', () => {
  it('отменяет свой PENDING-заказ', async () => {
    const repo = makeRepo()
    vi.mocked(repo.cancelPendingOrder).mockResolvedValue(true)
    const cancelOwnOrder = makeCancelOwnOrder(repo)
    await expect(cancelOwnOrder('u1', 'order-1')).resolves.toBeUndefined()
    expect(repo.cancelPendingOrder).toHaveBeenCalledWith('u1', 'order-1')
  })

  it('409 когда заказ чужой, не найден или не PENDING', async () => {
    const repo = makeRepo()
    vi.mocked(repo.cancelPendingOrder).mockResolvedValue(false)
    const cancelOwnOrder = makeCancelOwnOrder(repo)
    await expect(cancelOwnOrder('u1', 'order-1')).rejects.toMatchObject({ statusCode: 409 })
  })
})
