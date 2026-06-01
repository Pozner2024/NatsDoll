import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeAdminRouter } from './adminRoutes'
import type {
  GetDashboard, MarkAllMessagesRead, DashboardResponse,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
  AdminProductListResponse, AdminCategoryItem,
} from '../types'

const mockDashboard: DashboardResponse = {
  stats: { ordersToday: 1, revenueToday: 50, revenueMonth: 200, newMessages: 3, activeListings: 8 },
  recentOrders: [{ id: 'o1', orderNumber: 42, status: 'PAID', totalAmount: 50, createdAt: '2026-06-01T10:00:00.000Z', userName: 'Anna' }],
  recentMessages: [],
}

const mockProductList: AdminProductListResponse = {
  items: [{ id: 'p1', name: 'Bunny', slug: 'bunny', price: 24, stock: 5, isPublished: true, image: null, category: 'Dolls', categoryId: 'c1' }],
  total: 1, page: 1, totalPages: 1,
}

const mockCategories: AdminCategoryItem[] = [{ id: 'c1', name: 'Dolls', slug: 'dolls', productCount: 5 }]

function makeApp(overrides: {
  getDashboard?: GetDashboard
  markAllMessagesRead?: MarkAllMessagesRead
  listAdminProducts?: ListAdminProducts
  createProduct?: CreateProduct
  updateProduct?: UpdateProduct
  deleteProduct?: DeleteProduct
  togglePublish?: TogglePublish
  listCategoriesWithCount?: ListCategoriesWithCount
  createCategory?: CreateCategory
  updateCategory?: UpdateCategory
  deleteCategory?: DeleteCategory
} = {}) {
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('auth', { userId: 'u1', role: 'ADMIN' }); await next() })
  app.route('/admin', makeAdminRouter(
    overrides.getDashboard ?? vi.fn().mockResolvedValue(mockDashboard),
    overrides.markAllMessagesRead ?? vi.fn().mockResolvedValue(undefined),
    overrides.listAdminProducts ?? vi.fn().mockResolvedValue(mockProductList),
    overrides.createProduct ?? vi.fn().mockResolvedValue({ id: 'p1' }),
    overrides.updateProduct ?? vi.fn().mockResolvedValue(undefined),
    overrides.deleteProduct ?? vi.fn().mockResolvedValue(undefined),
    overrides.togglePublish ?? vi.fn().mockResolvedValue({ isPublished: false }),
    overrides.listCategoriesWithCount ?? vi.fn().mockResolvedValue(mockCategories),
    overrides.createCategory ?? vi.fn().mockResolvedValue({ id: 'c1' }),
    overrides.updateCategory ?? vi.fn().mockResolvedValue(undefined),
    overrides.deleteCategory ?? vi.fn().mockResolvedValue(undefined),
  ))
  return app
}

describe('GET /admin/dashboard', () => {
  it('returns dashboard data', async () => {
    const app = makeApp()
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(200)
    const body = await res.json() as DashboardResponse
    expect(body.stats.ordersToday).toBe(1)
  })

  it('returns 403 when not ADMIN', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => { c.set('auth', { userId: 'u1', role: 'CUSTOMER' }); await next() })
    app.route('/admin', makeAdminRouter(
      vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
    ))
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(403)
  })
})

describe('PATCH /admin/messages/mark-all-read', () => {
  it('returns 200', async () => {
    const markAll = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({ markAllMessagesRead: markAll })
    const res = await app.request('/admin/messages/mark-all-read', { method: 'PATCH' })
    expect(res.status).toBe(200)
    expect(markAll).toHaveBeenCalledOnce()
  })
})

describe('GET /admin/products', () => {
  it('returns product list', async () => {
    const app = makeApp()
    const res = await app.request('/admin/products')
    expect(res.status).toBe(200)
    const body = await res.json() as AdminProductListResponse
    expect(body.items).toHaveLength(1)
    expect(body.items[0].name).toBe('Bunny')
  })
})

describe('POST /admin/products', () => {
  it('creates product and returns 201', async () => {
    const createProduct = vi.fn().mockResolvedValue({ id: 'p2' })
    const app = makeApp({ createProduct })
    const res = await app.request('/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bear', slug: 'bear', description: 'desc', price: 18.5, stock: 3, categoryId: 'c1', images: [], messageOptions: [], isPublished: false }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    expect(body.id).toBe('p2')
  })

  it('returns 422 when name is missing', async () => {
    const app = makeApp()
    const res = await app.request('/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'bear' }),
    })
    expect(res.status).toBe(422)
  })
})

describe('PATCH /admin/products/:id/toggle-publish', () => {
  it('returns toggled state', async () => {
    const toggle = vi.fn().mockResolvedValue({ isPublished: true })
    const app = makeApp({ togglePublish: toggle })
    const res = await app.request('/admin/products/p1/toggle-publish', { method: 'PATCH' })
    expect(res.status).toBe(200)
    const body = await res.json() as { isPublished: boolean }
    expect(body.isPublished).toBe(true)
  })
})

describe('GET /admin/categories', () => {
  it('returns category list', async () => {
    const app = makeApp()
    const res = await app.request('/admin/categories')
    expect(res.status).toBe(200)
    const body = await res.json() as AdminCategoryItem[]
    expect(body[0].name).toBe('Dolls')
    expect(body[0].productCount).toBe(5)
  })
})

describe('DELETE /admin/categories/:id', () => {
  it('calls deleteCategory and returns ok', async () => {
    const del = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({ deleteCategory: del })
    const res = await app.request('/admin/categories/c1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(del).toHaveBeenCalledWith('c1')
  })
})
