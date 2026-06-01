import { describe, it, expect, vi } from 'vitest'
import { makeListCategoriesWithCount } from './listCategoriesWithCount'
import type { AdminRepository, AdminCategoryItem } from '../types'

const mockCat: AdminCategoryItem = { id: 'c1', name: 'Dolls', slug: 'dolls', productCount: 5 }

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(),
    listCategoriesWithCount: vi.fn().mockResolvedValue([mockCat]),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('listCategoriesWithCount', () => {
  it('returns category list from repo', async () => {
    const repo = makeRepo()
    const result = await makeListCategoriesWithCount(repo)()
    expect(result).toEqual([mockCat])
    expect(repo.listCategoriesWithCount).toHaveBeenCalledOnce()
  })
})
