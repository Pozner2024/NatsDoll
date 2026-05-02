import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeProductsRouter } from './productRoutes'

const sampleResponse = {
  items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img', stock: 1 }],
  total: 1,
  page: 1,
  totalPages: 1,
}

function makeApp(listProducts = vi.fn().mockResolvedValue(sampleResponse), listCategories = vi.fn().mockResolvedValue([])) {
  const app = new Hono()
  app.route('/', makeProductsRouter(listProducts, listCategories))
  return { app, listProducts, listCategories }
}

describe('GET /products', () => {
  it('returns 200 with default params (sort=newest, page=1, limit=12)', async () => {
    const { app, listProducts } = makeApp()
    const res = await app.request('/products')
    expect(res.status).toBe(200)
    expect(listProducts).toHaveBeenCalledWith({ sort: 'newest', page: 1, limit: 12, category: undefined })
    expect(await res.json()).toEqual(sampleResponse)
  })

  it('passes category, sort, page, limit from query', async () => {
    const { app, listProducts } = makeApp()
    await app.request('/products?category=animals&sort=price-asc&page=2&limit=24')
    expect(listProducts).toHaveBeenCalledWith({
      category: 'animals',
      sort: 'price-asc',
      page: 2,
      limit: 24,
    })
  })

  it('treats empty category as no filter', async () => {
    const { app, listProducts } = makeApp()
    const res = await app.request('/products?category=')
    expect(res.status).toBe(200)
    expect(listProducts).toHaveBeenCalledWith({ sort: 'newest', page: 1, limit: 12, category: undefined })
  })

  it('returns 400 for invalid sort', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?sort=foobar')
    expect(res.status).toBe(400)
  })

  it('returns 400 for page=0', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?page=0')
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative page', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?page=-1')
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-numeric page', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?page=abc')
    expect(res.status).toBe(400)
  })

  it('returns 400 when limit > 48', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?limit=99')
    expect(res.status).toBe(400)
  })
})

describe('GET /categories', () => {
  it('returns 200 with category list', async () => {
    const fake = [{ id: '1', slug: 'animals', name: 'Animals' }]
    const { app } = makeApp(undefined, vi.fn().mockResolvedValue(fake))
    const res = await app.request('/categories')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(fake)
  })
})
