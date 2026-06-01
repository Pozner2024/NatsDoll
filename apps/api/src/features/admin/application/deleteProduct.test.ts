import { describe, it, expect, vi } from 'vitest'
import { makeDeleteProduct } from './deleteProduct'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(),
    updateProduct: vi.fn(), deleteProduct: vi.fn().mockResolvedValue(undefined),
    togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('deleteProduct', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeDeleteProduct(repo)('p1')
    expect(repo.deleteProduct).toHaveBeenCalledWith('p1')
  })
})
