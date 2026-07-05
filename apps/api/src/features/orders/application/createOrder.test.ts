import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateOrder } from './createOrder'
import type { OrderRepository, ShippingAddress } from '../types'
import type { GetActiveSale } from '../../admin/types'

const noActiveSale: GetActiveSale = vi.fn().mockResolvedValue(null)

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
    createOrderFromItems: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
    getProductsForCheckout: vi.fn(),
    cancelPendingOrder: vi.fn(),
  }
}

describe('createOrder', () => {
  let repo: OrderRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('throws 400 when cart is empty', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([])
    const createOrder = makeCreateOrder(repo, noActiveSale)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 409 when a product is unavailable', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: false, quantity: 1, message: null, categoryId: 'cat1' },
    ])
    const createOrder = makeCreateOrder(repo, noActiveSale)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 409 when stock is insufficient', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 2, productIsAvailable: true, quantity: 5, message: null, categoryId: 'cat1' },
    ])
    const createOrder = makeCreateOrder(repo, noActiveSale)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('passes computed shippingCost to createOrderFromCart', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 15, productStock: 10, productIsAvailable: true, quantity: 2, message: null, categoryId: 'cat1' },
      { id: 'ci-2', productId: 'p2', productName: 'B', productImage: null,
        productPrice: 20, productStock: 5, productIsAvailable: true, quantity: 1, message: 'Hi', categoryId: 'cat2' },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 1, userId: 'u1', status: 'PENDING',
      totalAmount: 64, shippingCost: 14, trackingNumber: null,
      shippingAddress: address, createdAt: new Date().toISOString(), paymentClaimed: false, items: [],
    })
    const createOrder = makeCreateOrder(repo, noActiveSale)
    await createOrder('u1', address)
    // totalItemCount = 3, shipping = 12 + 2 = 14 (total пересчитывается в репозитории внутри транзакции)
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 14, address, null)
  })

  it('calculates shipping correctly for 1 item', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null, categoryId: 'cat1' },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 1, userId: 'u1', status: 'PENDING',
      totalAmount: 22, shippingCost: 12, trackingNumber: null,
      shippingAddress: address, createdAt: '2026-05-31T00:00:00.000Z', paymentClaimed: false, items: [],
    })
    const createOrder = makeCreateOrder(repo, noActiveSale)
    await createOrder('u1', address)
    // shipping = 12 (total пересчитывается в репозитории внутри транзакции)
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 12, address, null)
  })
})
