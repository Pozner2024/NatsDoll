import { describe, it, expect, vi } from 'vitest'
import { makeCreateCategory } from './createCategory'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn().mockResolvedValue({ id: 'c1' }),
    updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('createCategory', () => {
  it('delegates and returns id', async () => {
    const repo = makeRepo()
    const result = await makeCreateCategory(repo)('Dolls', 'dolls')
    expect(repo.createCategory).toHaveBeenCalledWith('Dolls', 'dolls')
    expect(result).toEqual({ id: 'c1' })
  })
})
