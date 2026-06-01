import { describe, it, expect, vi } from 'vitest'
import { makeCreateProduct } from './createProduct'
import type { AdminRepository, AdminProductInput } from '../types'

const input: AdminProductInput = {
  name: 'Bunny', slug: 'bunny', description: 'desc', price: 24,
  stock: 5, categoryId: 'c1', images: [], messageOptions: [], isPublished: false,
}

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn().mockResolvedValue({ id: 'p1' }),
    updateProduct: vi.fn(), deleteProduct: vi.fn(), togglePublish: vi.fn(),
    listCategoriesWithCount: vi.fn(), createCategory: vi.fn(),
    updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('createProduct', () => {
  it('delegates to repo and returns id', async () => {
    const repo = makeRepo()
    const result = await makeCreateProduct(repo)(input)
    expect(repo.createProduct).toHaveBeenCalledWith(input)
    expect(result).toEqual({ id: 'p1' })
  })
})
