import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './store'
import * as api from './cartApi'

vi.mock('./cartApi')

// Мутируем объект между тестами — vi.mock закрывается над ссылкой.
const authState = { isLoggedIn: true }

vi.mock('@/entities/user', () => ({
  useAuthStore: vi.fn(() => authState),
}))

// ---------------------------------------------------------------------------
// Logged-in (server mode) — поведение без изменений
// ---------------------------------------------------------------------------
describe('cartStore — logged-in (server mode)', () => {
  beforeEach(() => {
    authState.isLoggedIn = true
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
    expect(store.items[0]?.message).toBe('Hi')
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

// ---------------------------------------------------------------------------
// Guest mode (localStorage)
// ---------------------------------------------------------------------------
describe('cartStore — guest mode (localStorage)', () => {
  beforeEach(() => {
    authState.isLoggedIn = false
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('starts empty', () => {
    const store = useCartStore()
    expect(store.itemCount).toBe(0)
    expect(store.totalAmount).toBe(0)
    expect(store.items).toEqual([])
  })

  it('add() persists item to localStorage', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 2, message: null, productName: 'Ring', productImage: '/img.jpg', productPrice: 15 })
    const raw = localStorage.getItem('natsdoll_guest_cart')
    expect(raw).not.toBeNull()
    const stored = JSON.parse(raw!)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ productId: 'p1', quantity: 2, message: null, productName: 'Ring', productPrice: 15 })
  })

  it('add() accumulates quantity for the same productId', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 1, message: null, productName: 'Ring', productImage: null, productPrice: 15 })
    await store.add({ productId: 'p1', quantity: 3, message: 'Hello', productName: 'Ring', productImage: null, productPrice: 15 })
    expect(store.itemCount).toBe(4)
    expect(store.items).toHaveLength(1)
  })

  it('add() keeps distinct products as separate rows', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 1, message: null, productName: 'A', productImage: null, productPrice: 10 })
    await store.add({ productId: 'p2', quantity: 2, message: null, productName: 'B', productImage: null, productPrice: 20 })
    expect(store.items).toHaveLength(2)
  })

  it('itemCount and totalAmount are computed from local data', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 2, message: null, productName: 'A', productImage: null, productPrice: 10 })
    await store.add({ productId: 'p2', quantity: 1, message: null, productName: 'B', productImage: null, productPrice: 30 })
    expect(store.itemCount).toBe(3)
    expect(store.totalAmount).toBe(50)
  })

  it('survives store reinitialisation — load() reads from localStorage', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 2, message: 'Hi', productName: 'Ring', productImage: null, productPrice: 15 })

    // Simulate fresh store instance (new page load)
    setActivePinia(createPinia())
    const store2 = useCartStore()
    await store2.load()
    expect(store2.itemCount).toBe(2)
    expect(store2.items[0]?.productId).toBe('p1')
    expect(store2.items[0]?.message).toBe('Hi')
  })

  it('update() changes quantity in localStorage', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 1, message: null, productName: 'Ring', productImage: null, productPrice: 15 })
    await store.update('p1', 5)
    expect(store.itemCount).toBe(5)
    const stored = JSON.parse(localStorage.getItem('natsdoll_guest_cart')!)
    expect(stored[0].quantity).toBe(5)
  })

  it('remove() deletes item from localStorage', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 2, message: null, productName: 'Ring', productImage: null, productPrice: 15 })
    await store.remove('p1')
    expect(store.itemCount).toBe(0)
    expect(store.items).toHaveLength(0)
    const stored = JSON.parse(localStorage.getItem('natsdoll_guest_cart')!)
    expect(stored).toHaveLength(0)
  })

  it('reset() clears localStorage', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 1, message: null, productName: 'Ring', productImage: null, productPrice: 15 })
    store.reset()
    expect(store.itemCount).toBe(0)
    expect(localStorage.getItem('natsdoll_guest_cart')).toBeNull()
  })

  it('guestItems getter returns {productId, quantity, message}[] for checkout payload', async () => {
    const store = useCartStore()
    await store.add({ productId: 'p1', quantity: 2, message: 'Birthday', productName: 'Ring', productImage: null, productPrice: 15 })
    await store.add({ productId: 'p2', quantity: 1, message: null, productName: 'Brooch', productImage: null, productPrice: 25 })
    expect(store.guestItems).toEqual([
      { productId: 'p1', quantity: 2, message: 'Birthday' },
      { productId: 'p2', quantity: 1, message: null },
    ])
  })

  it('does not call any cartApi functions', async () => {
    const store = useCartStore()
    await store.load()
    await store.add({ productId: 'p1', quantity: 1, message: null, productName: 'Ring', productImage: null, productPrice: 15 })
    await store.update('p1', 3)
    await store.remove('p1')
    expect(api.fetchCart).not.toHaveBeenCalled()
    expect(api.addCartItem).not.toHaveBeenCalled()
    expect(api.updateCartItem).not.toHaveBeenCalled()
    expect(api.removeCartItem).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Merge on login (guest localStorage → server cart)
// ---------------------------------------------------------------------------
describe('cartStore — mergeGuestCart', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('pushes each guest item to server, clears localStorage, keeps server cart', async () => {
    // Гость кладёт два товара
    authState.isLoggedIn = false
    const guest = useCartStore()
    await guest.add({ productId: 'p1', quantity: 2, message: 'Hi', productName: 'A', productImage: null, productPrice: 10 })
    await guest.add({ productId: 'p2', quantity: 1, message: null, productName: 'B', productImage: null, productPrice: 20 })

    // Логинится — новый стор, серверный режим
    setActivePinia(createPinia())
    authState.isLoggedIn = true
    // Каждый addCartItem возвращает нарастающую корзину — итоговой должна стать
    // та, что вернул ПОСЛЕДНИЙ успешный вызов.
    vi.mocked(api.addCartItem)
      .mockResolvedValueOnce({
        items: [{ id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'A', productImage: null, unitPrice: 10, quantity: 2, subtotal: 20, message: 'Hi' }],
        totalAmount: 20,
        itemCount: 2,
      })
      .mockResolvedValueOnce({
        items: [
          { id: 'ci-1', productId: 'p1', productSlug: 'p', productName: 'A', productImage: null, unitPrice: 10, quantity: 2, subtotal: 20, message: 'Hi' },
          { id: 'ci-2', productId: 'p2', productSlug: 'p', productName: 'B', productImage: null, unitPrice: 20, quantity: 1, subtotal: 20, message: null },
        ],
        totalAmount: 40,
        itemCount: 3,
      })

    const store = useCartStore()
    await store.mergeGuestCart()

    expect(api.addCartItem).toHaveBeenCalledTimes(2)
    expect(api.addCartItem).toHaveBeenNthCalledWith(1, { productId: 'p1', quantity: 2, message: 'Hi' })
    expect(api.addCartItem).toHaveBeenNthCalledWith(2, { productId: 'p2', quantity: 1, message: null })
    expect(api.fetchCart).not.toHaveBeenCalled()
    expect(store.itemCount).toBe(3)
    expect(localStorage.getItem('natsdoll_guest_cart')).toBeNull()
  })

  it('falls back to plain load when no guest items', async () => {
    authState.isLoggedIn = true
    vi.mocked(api.fetchCart).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })
    const store = useCartStore()
    await store.mergeGuestCart()
    expect(api.addCartItem).not.toHaveBeenCalled()
    expect(api.fetchCart).toHaveBeenCalledTimes(1)
  })

  it('skips an out-of-stock guest item but merges the rest', async () => {
    authState.isLoggedIn = false
    const guest = useCartStore()
    await guest.add({ productId: 'p1', quantity: 1, message: null, productName: 'A', productImage: null, productPrice: 10 })
    await guest.add({ productId: 'p2', quantity: 1, message: null, productName: 'B', productImage: null, productPrice: 20 })

    setActivePinia(createPinia())
    authState.isLoggedIn = true
    vi.mocked(api.addCartItem)
      .mockRejectedValueOnce(Object.assign(new Error('Not enough stock'), { status: 409 }))
      .mockResolvedValueOnce({
        items: [{ id: 'ci-2', productId: 'p2', productSlug: 'p', productName: 'B', productImage: null, unitPrice: 20, quantity: 1, subtotal: 20, message: null }],
        totalAmount: 20,
        itemCount: 1,
      })

    const store = useCartStore()
    await store.mergeGuestCart()

    expect(api.addCartItem).toHaveBeenCalledTimes(2)
    expect(store.itemCount).toBe(1)
    expect(localStorage.getItem('natsdoll_guest_cart')).toBeNull()
  })

  it('keeps an item that failed with a transient (5xx) error during a partial merge', async () => {
    authState.isLoggedIn = false
    const guest = useCartStore()
    await guest.add({ productId: 'p1', quantity: 1, message: null, productName: 'A', productImage: null, productPrice: 10 })
    await guest.add({ productId: 'p2', quantity: 1, message: null, productName: 'B', productImage: null, productPrice: 20 })

    setActivePinia(createPinia())
    authState.isLoggedIn = true
    // p1 падает по серверной ошибке (500) — транзиент, товар нельзя терять.
    // p2 переносится успешно.
    vi.mocked(api.addCartItem)
      .mockRejectedValueOnce(Object.assign(new Error('Server error'), { status: 500 }))
      .mockResolvedValueOnce({
        items: [{ id: 'ci-2', productId: 'p2', productSlug: 'p', productName: 'B', productImage: null, unitPrice: 20, quantity: 1, subtotal: 20, message: null }],
        totalAmount: 20,
        itemCount: 1,
      })

    const store = useCartStore()
    await store.mergeGuestCart()

    // Серверная корзина обновлена перенесённым p2, а p1 сохранён в гостевой корзине.
    expect(store.itemCount).toBe(1)
    const stored = JSON.parse(localStorage.getItem('natsdoll_guest_cart')!)
    expect(stored).toHaveLength(1)
    expect(stored[0].productId).toBe('p1')
  })

  it('keeps guest localStorage when every item is rejected (no silent loss)', async () => {
    // Все товары отвергнуты сервером (например, требуют надписи → 400), но сама
    // серверная корзина читается успешно. Раньше localStorage стирался и корзина
    // пропадала молча — теперь, раз не слит ни один товар, гостевую корзину не трогаем.
    authState.isLoggedIn = false
    const guest = useCartStore()
    await guest.add({ productId: 'p1', quantity: 1, message: null, productName: 'A', productImage: null, productPrice: 10 })

    setActivePinia(createPinia())
    authState.isLoggedIn = true
    vi.mocked(api.addCartItem).mockRejectedValue(new Error('Message is required for this product'))
    vi.mocked(api.fetchCart).mockResolvedValue({ items: [], totalAmount: 0, itemCount: 0 })

    const store = useCartStore()
    await store.mergeGuestCart()

    const stored = JSON.parse(localStorage.getItem('natsdoll_guest_cart')!)
    expect(stored).toHaveLength(1)
  })

  it('keeps guest localStorage intact when merge fully fails', async () => {
    authState.isLoggedIn = false
    const guest = useCartStore()
    await guest.add({ productId: 'p1', quantity: 1, message: null, productName: 'A', productImage: null, productPrice: 10 })

    setActivePinia(createPinia())
    authState.isLoggedIn = true
    vi.mocked(api.addCartItem).mockRejectedValue(new Error('Not enough stock'))
    vi.mocked(api.fetchCart).mockRejectedValue(new Error('Network down'))

    const store = useCartStore()
    await store.mergeGuestCart()

    expect(store.error).toBe('Network down')
    // localStorage не очищен — гостевые товары не потеряны
    const stored = JSON.parse(localStorage.getItem('natsdoll_guest_cart')!)
    expect(stored).toHaveLength(1)
  })
})
