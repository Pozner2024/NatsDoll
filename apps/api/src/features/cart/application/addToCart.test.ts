import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAddToCart } from './addToCart'
import type { CartRepository } from '../types'

function makeRepo(): CartRepository {
  return {
    getOrCreateCartId: vi.fn(),
    findProductForCart: vi.fn(),
    findCartItem: vi.fn(),
    findCartItemById: vi.fn(),
    createCartItem: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    deleteCartItem: vi.fn(),
    getCartView: vi.fn(),
  }
}

describe('addToCart', () => {
  let repo: CartRepository

  beforeEach(() => {
    repo = makeRepo()
    vi.mocked(repo.getOrCreateCartId).mockResolvedValue('cart-1')
    vi.mocked(repo.getCartView).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })
  })

  it('throws 404 when product not found', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue(null)
    const addToCart = makeAddToCart(repo)
    await expect(addToCart({ userId: 'u1', productId: 'p1', quantity: 1, message: null }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 410 when product unavailable (unpublished or soft-deleted)', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 5, hasMessage: false, messageOptions: [], isAvailable: false,
    })
    const addToCart = makeAddToCart(repo)
    await expect(addToCart({ userId: 'u1', productId: 'p1', quantity: 1, message: null }))
      .rejects.toMatchObject({ statusCode: 410 })
  })

  it('throws 409 when quantity exceeds stock', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 2, hasMessage: false, messageOptions: [], isAvailable: true,
    })
    vi.mocked(repo.findCartItem).mockResolvedValue(null)
    const addToCart = makeAddToCart(repo)
    await expect(addToCart({ userId: 'u1', productId: 'p1', quantity: 5, message: null }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 400 when category requires message but message is missing', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 5, hasMessage: true, messageOptions: ['Hi'], isAvailable: true,
    })
    const addToCart = makeAddToCart(repo)
    await expect(addToCart({ userId: 'u1', productId: 'p1', quantity: 1, message: null }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when message provided for category without hasMessage', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 5, hasMessage: false, messageOptions: [], isAvailable: true,
    })
    const addToCart = makeAddToCart(repo)
    await expect(addToCart({ userId: 'u1', productId: 'p1', quantity: 1, message: 'hi' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('creates new cart item when none exists', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 5, hasMessage: false, messageOptions: [], isAvailable: true,
    })
    vi.mocked(repo.findCartItem).mockResolvedValue(null)
    const addToCart = makeAddToCart(repo)
    await addToCart({ userId: 'u1', productId: 'p1', quantity: 2, message: null })
    expect(repo.createCartItem).toHaveBeenCalledWith('cart-1', 'p1', 2, null)
    expect(repo.updateCartItemQuantity).not.toHaveBeenCalled()
  })

  it('increments quantity when item with same productId+message exists', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 5, hasMessage: true, messageOptions: ['Hi'], isAvailable: true,
    })
    vi.mocked(repo.findCartItem).mockResolvedValue({ id: 'ci-1', quantity: 1 })
    const addToCart = makeAddToCart(repo)
    await addToCart({ userId: 'u1', productId: 'p1', quantity: 2, message: 'Hi' })
    expect(repo.updateCartItemQuantity).toHaveBeenCalledWith('ci-1', 3)
    expect(repo.createCartItem).not.toHaveBeenCalled()
  })

  it('returns the refreshed cart view', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 5, hasMessage: false, messageOptions: [], isAvailable: true,
    })
    vi.mocked(repo.findCartItem).mockResolvedValue(null)
    vi.mocked(repo.getCartView).mockResolvedValue({
      items: [{ id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'P', productImage: null, unitPrice: 10, quantity: 2, subtotal: 20, message: null }],
      totalAmount: 20,
      itemCount: 2,
    })
    const addToCart = makeAddToCart(repo)
    const result = await addToCart({ userId: 'u1', productId: 'p1', quantity: 2, message: null })
    expect(result.totalAmount).toBe(20)
    expect(result.items).toHaveLength(1)
  })

  it('throws 400 when message length exceeds 100', async () => {
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 5, hasMessage: true, messageOptions: [], isAvailable: true,
    })
    const addToCart = makeAddToCart(repo)
    await expect(addToCart({ userId: 'u1', productId: 'p1', quantity: 1, message: 'x'.repeat(101) }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when quantity is zero', async () => {
    const addToCart = makeAddToCart(repo)
    await expect(addToCart({ userId: 'u1', productId: 'p1', quantity: 0, message: null }))
      .rejects.toMatchObject({ statusCode: 400 })
  })
})
