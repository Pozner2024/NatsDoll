import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { makeFavoritesRouter } from './favoritesRoutes'
import type { AddFavorite, RemoveFavorite, ListFavorites } from '../types'
import { AppError } from '../../../shared/errors'

function makeStubs() {
  return {
    addFavorite: vi.fn() as unknown as AddFavorite,
    removeFavorite: vi.fn() as unknown as RemoveFavorite,
    listFavorites: vi.fn() as unknown as ListFavorites,
  }
}

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
  app.route('/favorites', makeFavoritesRouter(stubs.addFavorite, stubs.removeFavorite, stubs.listFavorites))
  return app
}

describe('favoritesRoutes', () => {
  let stubs: ReturnType<typeof makeStubs>
  beforeEach(() => { stubs = makeStubs() })

  it('GET /favorites returns the user products list', async () => {
    vi.mocked(stubs.listFavorites).mockResolvedValue([
      { id: 'p1', slug: 'p1', name: 'P1', price: 10, image: null, stock: 5 },
    ])
    const app = buildApp(stubs)
    const res = await app.request('/favorites')
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(1)
    expect(stubs.listFavorites).toHaveBeenCalledWith('u1')
  })

  it('POST /favorites/:productId adds and returns favoriteIds', async () => {
    vi.mocked(stubs.addFavorite).mockResolvedValue({ favoriteIds: ['p1'] })
    const app = buildApp(stubs)
    const res = await app.request('/favorites/p1', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ favoriteIds: ['p1'] })
    expect(stubs.addFavorite).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1' })
  })

  it('DELETE /favorites/:productId removes and returns favoriteIds', async () => {
    vi.mocked(stubs.removeFavorite).mockResolvedValue({ favoriteIds: [] })
    const app = buildApp(stubs)
    const res = await app.request('/favorites/p1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ favoriteIds: [] })
    expect(stubs.removeFavorite).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1' })
  })

  it('forwards AppError status (404) through onError', async () => {
    vi.mocked(stubs.addFavorite).mockRejectedValue(new AppError(404, 'Product not found'))
    const app = buildApp(stubs)
    const res = await app.request('/favorites/missing', { method: 'POST' })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Product not found' })
  })
})
