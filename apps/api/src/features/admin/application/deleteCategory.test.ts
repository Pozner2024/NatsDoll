import { describe, it, expect, vi } from 'vitest'
import { makeDeleteCategory } from './deleteCategory'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn().mockResolvedValue(undefined),
  } as unknown as AdminRepository
}

describe('deleteCategory', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeDeleteCategory(repo)('c1')
    expect(repo.deleteCategory).toHaveBeenCalledWith('c1')
  })
})
