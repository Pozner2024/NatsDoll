import { describe, it, expect, vi } from 'vitest'
import { makeListAdminProducts } from './listAdminProducts'
import type { AdminRepository, AdminProductListItem } from '../types'

const mockItem: AdminProductListItem = {
  id: 'p1', name: 'Bunny', slug: 'bunny', price: 24, stock: 5,
  isPublished: true, image: null, category: 'Dolls', categoryId: 'c1',
}

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    getDashboardData: vi.fn(),
    markAllMessagesRead: vi.fn(),
    listProducts: vi.fn().mockResolvedValue({ items: [mockItem], total: 1 }),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    togglePublish: vi.fn(),
    listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    ...overrides,
  } as unknown as AdminRepository
}

describe('listAdminProducts', () => {
  it('returns items with pagination', async () => {
    const repo = makeRepo()
    const listAdminProducts = makeListAdminProducts(repo)
    const result = await listAdminProducts({ page: 1, limit: 12 })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.page).toBe(1)
  })

  it('calculates totalPages correctly', async () => {
    const repo = makeRepo({ listProducts: vi.fn().mockResolvedValue({ items: [], total: 25 }) })
    const result = await makeListAdminProducts(repo)({ page: 1, limit: 12 })
    expect(result.totalPages).toBe(3)
  })

  it('returns totalPages 0 when total is 0', async () => {
    const repo = makeRepo({ listProducts: vi.fn().mockResolvedValue({ items: [], total: 0 }) })
    const result = await makeListAdminProducts(repo)({ page: 1, limit: 12 })
    expect(result.totalPages).toBe(0)
  })
})
