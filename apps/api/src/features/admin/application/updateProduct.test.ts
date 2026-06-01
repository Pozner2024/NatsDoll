import { describe, it, expect, vi } from 'vitest'
import { makeUpdateProduct } from './updateProduct'
import type { AdminRepository, AdminProductInput } from '../types'

const input: AdminProductInput = {
  name: 'Bunny', slug: 'bunny', description: 'desc', price: 24,
  stock: 5, categoryId: 'c1', images: [], messageOptions: [], isPublished: true,
}

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(),
    updateProduct: vi.fn().mockResolvedValue(undefined), deleteProduct: vi.fn(),
    togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('updateProduct', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeUpdateProduct(repo)('p1', input)
    expect(repo.updateProduct).toHaveBeenCalledWith('p1', input)
  })
})
