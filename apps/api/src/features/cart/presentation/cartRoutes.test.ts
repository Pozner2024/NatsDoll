import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { makeCartRouter } from './cartRoutes'
import type { AddToCart, GetCart, UpdateQuantity, RemoveFromCart, CartView } from '../types'
import { AppError } from '../../../shared/errors'

function makeStubs() {
  return {
    addToCart: vi.fn() as unknown as AddToCart,
    getCart: vi.fn() as unknown as GetCart,
    updateQuantity: vi.fn() as unknown as UpdateQuantity,
    removeFromCart: vi.fn() as unknown as RemoveFromCart,
  }
}

const emptyCart: CartView = { items: [], totalAmount: 0, itemCount: 0 }

function buildApp(stubs: ReturnType<typeof makeStubs>, userId = 'u1') {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('auth', { userId, role: 'CUSTOMER' })
    await next()
  })
  app.onError((err, c) => {
    if (err instanceof AppError) return c.json({ error: err.message }, err.statusCode)
    return c.json({ error: 'Internal' }, 500)
  })
  app.route('/cart', makeCartRouter(stubs.addToCart, stubs.getCart, stubs.updateQuantity, stubs.removeFromCart))
  return app
}

describe('cartRoutes', () => {
  let stubs: ReturnType<typeof makeStubs>
  beforeEach(() => { stubs = makeStubs() })

  it('GET /cart returns the cart for the authed user', async () => {
    vi.mocked(stubs.getCart).mockResolvedValue(emptyCart)
    const app = buildApp(stubs)
    const res = await app.request('/cart')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(emptyCart)
    expect(stubs.getCart).toHaveBeenCalledWith('u1')
  })

  it('POST /cart/items adds an item', async () => {
    vi.mocked(stubs.addToCart).mockResolvedValue(emptyCart)
    const app = buildApp(stubs)
    const res = await app.request('/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'p1', quantity: 2, message: null }),
    })
    expect(res.status).toBe(200)
    expect(stubs.addToCart).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1', quantity: 2, message: null })
  })

  it('POST /cart/items rejects missing productId with 400', async () => {
    const app = buildApp(stubs)
    const res = await app.request('/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /cart/items/:id updates quantity', async () => {
    vi.mocked(stubs.updateQuantity).mockResolvedValue(emptyCart)
    const app = buildApp(stubs)
    const res = await app.request('/cart/items/ci-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 3 }),
    })
    expect(res.status).toBe(200)
    expect(stubs.updateQuantity).toHaveBeenCalledWith({ userId: 'u1', itemId: 'ci-1', quantity: 3 })
  })

  it('DELETE /cart/items/:id removes item', async () => {
    vi.mocked(stubs.removeFromCart).mockResolvedValue(emptyCart)
    const app = buildApp(stubs)
    const res = await app.request('/cart/items/ci-1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(stubs.removeFromCart).toHaveBeenCalledWith('u1', 'ci-1')
  })

  it('forwards AppError statusCode through onError', async () => {
    vi.mocked(stubs.addToCart).mockRejectedValue(new AppError(409, 'Not enough stock'))
    const app = buildApp(stubs)
    const res = await app.request('/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'p1', quantity: 99 }),
    })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Not enough stock' })
  })
})
