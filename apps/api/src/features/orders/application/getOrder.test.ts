import { describe, it, expect, vi } from 'vitest'
import { makeGetOrder } from './getOrder'
import type { OrderRepository, ShippingAddress } from '../types'

const address: ShippingAddress = {
  fullName: 'Natasha', line1: '123 St', city: 'NY', country: 'US', postalCode: '10001',
}

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
  }
}

describe('getOrder', () => {
  it('throws 404 when order not found', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getOrderById).mockResolvedValue(null)
    const getOrder = makeGetOrder(repo)
    await expect(getOrder('u1', 'order-999')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when order belongs to different user', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getOrderById).mockResolvedValue({
      id: 'order-1', orderNumber: 1, userId: 'other-user', status: 'PENDING', totalAmount: 10,
      shippingAddress: address, shippingCost: 0, trackingNumber: null, createdAt: '2026-05-21T00:00:00.000Z', items: [],
    })
    const getOrder = makeGetOrder(repo)
    await expect(getOrder('u1', 'order-1')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns order when userId matches', async () => {
    const repo = makeRepo()
    const order = {
      id: 'order-1', orderNumber: 1, userId: 'u1', status: 'PENDING', totalAmount: 10,
      shippingAddress: address, shippingCost: 0, trackingNumber: null, createdAt: '2026-05-21T00:00:00.000Z', items: [],
    }
    vi.mocked(repo.getOrderById).mockResolvedValue(order)
    const getOrder = makeGetOrder(repo)
    const result = await getOrder('u1', 'order-1')
    expect(result.id).toBe('order-1')
  })
})
