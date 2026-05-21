import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './store'
import * as api from './cartApi'

vi.mock('./cartApi')

describe('cartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts empty', () => {
    const store = useCartStore()
    expect(store.itemCount).toBe(0)
    expect(store.totalAmount).toBe(0)
    expect(store.items).toEqual([])
  })

  it('loads cart from API once', async () => {
    vi.mocked(api.fetchCart).mockResolvedValue({
      items: [
        { id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'P', productImage: null, unitPrice: 10, quantity: 2, subtotal: 20, message: null },
      ],
      totalAmount: 20,
      itemCount: 2,
    })
    const store = useCartStore()
    await store.load()
    await store.load()
    expect(api.fetchCart).toHaveBeenCalledTimes(1)
    expect(store.itemCount).toBe(2)
  })

  it('load(force=true) refetches even if loaded', async () => {
    vi.mocked(api.fetchCart).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })
    const store = useCartStore()
    await store.load()
    await store.load(true)
    expect(api.fetchCart).toHaveBeenCalledTimes(2)
  })

  it('add() updates cart from response', async () => {
    vi.mocked(api.addCartItem).mockResolvedValue({
      items: [
        { id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'P', productImage: null, unitPrice: 10, quantity: 1, subtotal: 10, message: 'Hi' },
      ],
      totalAmount: 10,
      itemCount: 1,
    })
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 1, message: 'Hi' })
    expect(store.itemCount).toBe(1)
    expect(store.items[0].message).toBe('Hi')
  })

  it('update() updates cart from response', async () => {
    vi.mocked(api.updateCartItem).mockResolvedValue({
      items: [
        { id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'P', productImage: null, unitPrice: 10, quantity: 5, subtotal: 50, message: null },
      ],
      totalAmount: 50,
      itemCount: 5,
    })
    const store = useCartStore()
    await store.update('ci-1', 5)
    expect(store.itemCount).toBe(5)
    expect(api.updateCartItem).toHaveBeenCalledWith('ci-1', 5)
  })

  it('remove() updates cart from response', async () => {
    vi.mocked(api.removeCartItem).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })
    const store = useCartStore()
    await store.remove('ci-1')
    expect(store.itemCount).toBe(0)
    expect(api.removeCartItem).toHaveBeenCalledWith('ci-1')
  })

  it('reset() empties cart', async () => {
    vi.mocked(api.fetchCart).mockResolvedValue({
      items: [{ id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'P', productImage: null, unitPrice: 10, quantity: 2, subtotal: 20, message: null }],
      totalAmount: 20,
      itemCount: 2,
    })
    const store = useCartStore()
    await store.load()
    store.reset()
    expect(store.itemCount).toBe(0)
  })

  it('stores error message when load fails', async () => {
    vi.mocked(api.fetchCart).mockRejectedValue(new Error('Network down'))
    const store = useCartStore()
    await store.load()
    expect(store.error).toBe('Network down')
    expect(store.itemCount).toBe(0)
  })
})
