import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRemoveFromCart } from './removeFromCart'
import type { CartRepository } from '../types'

function makeRepo(): CartRepository {
  return {
    getOrCreateCartId: vi.fn(),
    findProductForCart: vi.fn(),
    findCartItemById: vi.fn(),
    addCartItemRespectingStock: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    deleteCartItem: vi.fn(),
    getCartView: vi.fn(),
  }
}

describe('removeFromCart', () => {
  let repo: CartRepository
  beforeEach(() => {
    repo = makeRepo()
    vi.mocked(repo.getOrCreateCartId).mockResolvedValue('cart-1')
    vi.mocked(repo.getCartView).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })
  })

  it('throws 404 when item not found', async () => {
    vi.mocked(repo.findCartItemById).mockResolvedValue(null)
    const removeFromCart = makeRemoveFromCart(repo)
    await expect(removeFromCart('u1', 'ci-x')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when item belongs to another cart', async () => {
    vi.mocked(repo.findCartItemById).mockResolvedValue({ id: 'ci-1', cartId: 'cart-OTHER', productId: 'p1' })
    const removeFromCart = makeRemoveFromCart(repo)
    await expect(removeFromCart('u1', 'ci-1')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('deletes the item and returns refreshed cart', async () => {
    vi.mocked(repo.findCartItemById).mockResolvedValue({ id: 'ci-1', cartId: 'cart-1', productId: 'p1' })
    const removeFromCart = makeRemoveFromCart(repo)
    await removeFromCart('u1', 'ci-1')
    expect(repo.deleteCartItem).toHaveBeenCalledWith('ci-1')
    expect(repo.getCartView).toHaveBeenCalledWith('u1')
  })
})
