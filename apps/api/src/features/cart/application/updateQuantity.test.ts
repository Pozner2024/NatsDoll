import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeUpdateQuantity } from './updateQuantity'
import type { CartRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'

const noSale: GetActiveSale = async () => null

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

describe('updateQuantity', () => {
  let repo: CartRepository
  beforeEach(() => {
    repo = makeRepo()
    vi.mocked(repo.getOrCreateCartId).mockResolvedValue('cart-1')
    vi.mocked(repo.getCartView).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })
  })

  it('throws 404 when item not found', async () => {
    vi.mocked(repo.findCartItemById).mockResolvedValue(null)
    const updateQuantity = makeUpdateQuantity(repo, noSale)
    await expect(updateQuantity({ userId: 'u1', itemId: 'ci-x', quantity: 2 }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when item belongs to another user cart', async () => {
    vi.mocked(repo.getOrCreateCartId).mockResolvedValue('cart-1')
    vi.mocked(repo.findCartItemById).mockResolvedValue({ id: 'ci-1', cartId: 'cart-OTHER', productId: 'p1' })
    const updateQuantity = makeUpdateQuantity(repo, noSale)
    await expect(updateQuantity({ userId: 'u1', itemId: 'ci-1', quantity: 2 }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 400 when quantity is less than 1', async () => {
    vi.mocked(repo.findCartItemById).mockResolvedValue({ id: 'ci-1', cartId: 'cart-1', productId: 'p1' })
    const updateQuantity = makeUpdateQuantity(repo, noSale)
    await expect(updateQuantity({ userId: 'u1', itemId: 'ci-1', quantity: 0 }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 409 when quantity exceeds stock', async () => {
    vi.mocked(repo.findCartItemById).mockResolvedValue({ id: 'ci-1', cartId: 'cart-1', productId: 'p1' })
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 2, messageOptions: [], isAvailable: true,
    })
    const updateQuantity = makeUpdateQuantity(repo, noSale)
    await expect(updateQuantity({ userId: 'u1', itemId: 'ci-1', quantity: 5 }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('updates and returns cart view', async () => {
    vi.mocked(repo.findCartItemById).mockResolvedValue({ id: 'ci-1', cartId: 'cart-1', productId: 'p1' })
    vi.mocked(repo.findProductForCart).mockResolvedValue({
      id: 'p1', price: 10, stock: 10, messageOptions: [], isAvailable: true,
    })
    const updateQuantity = makeUpdateQuantity(repo, noSale)
    await updateQuantity({ userId: 'u1', itemId: 'ci-1', quantity: 3 })
    expect(repo.updateCartItemQuantity).toHaveBeenCalledWith('ci-1', 3)
    expect(repo.getCartView).toHaveBeenCalledWith('u1')
  })
})
