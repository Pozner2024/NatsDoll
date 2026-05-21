import { describe, it, expect, vi } from 'vitest'
import { makeGetCart } from './getCart'
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

describe('getCart', () => {
  it('delegates to repository.getCartView and returns the result', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getCartView).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })
    const getCart = makeGetCart(repo)
    const result = await getCart('user-1')
    expect(repo.getCartView).toHaveBeenCalledWith('user-1')
    expect(result.items).toEqual([])
  })

  it('returns items with subtotal computed by repository', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getCartView).mockResolvedValue({
      items: [
        { id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'P', productImage: null, unitPrice: 10, quantity: 2, subtotal: 20, message: 'Hi' },
      ],
      totalAmount: 20,
      itemCount: 2,
    })
    const getCart = makeGetCart(repo)
    const result = await getCart('user-1')
    expect(result.totalAmount).toBe(20)
    expect(result.items[0].message).toBe('Hi')
  })
})
