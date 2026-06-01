import { describe, it, expect, vi } from 'vitest'
import { makeUpdateCategory } from './updateCategory'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn().mockResolvedValue(undefined), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('updateCategory', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeUpdateCategory(repo)('c1', 'Dolls New', 'dolls-new')
    expect(repo.updateCategory).toHaveBeenCalledWith('c1', 'Dolls New', 'dolls-new')
  })
})
