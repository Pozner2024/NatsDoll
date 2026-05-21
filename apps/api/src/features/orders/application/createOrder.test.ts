import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateOrder } from './createOrder'
import type { OrderRepository, ShippingAddress } from '../types'

const address: ShippingAddress = {
  fullName: 'Natasha',
  line1: '123 Main St',
  city: 'New York',
  country: 'US',
  postalCode: '10001',
}

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
  }
}

describe('createOrder', () => {
  let repo: OrderRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('throws 400 when cart is empty', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([])
    const createOrder = makeCreateOrder(repo)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 409 when a product is unavailable', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: false, quantity: 1, message: null },
    ])
    const createOrder = makeCreateOrder(repo)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 409 when stock is insufficient', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 2, productIsAvailable: true, quantity: 5, message: null },
    ])
    const createOrder = makeCreateOrder(repo)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('calls createOrderFromCart with correct totalAmount', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 15, productStock: 10, productIsAvailable: true, quantity: 2, message: null },
      { id: 'ci-2', productId: 'p2', productName: 'B', productImage: null,
        productPrice: 20, productStock: 5, productIsAvailable: true, quantity: 1, message: 'Hi' },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', userId: 'u1', status: 'PENDING', totalAmount: 50,
      shippingAddress: address, createdAt: new Date().toISOString(), items: [],
    })
    const createOrder = makeCreateOrder(repo)
    await createOrder('u1', address)
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 50, address)
  })

  it('returns the order detail from repository', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null },
    ]
    const orderDetail = {
      id: 'order-1', userId: 'u1', status: 'PENDING', totalAmount: 10,
      shippingAddress: address, createdAt: '2026-05-21T00:00:00.000Z', items: [],
    }
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue(orderDetail)
    const createOrder = makeCreateOrder(repo)
    const result = await createOrder('u1', address)
    expect(result).toEqual(orderDetail)
  })
})
