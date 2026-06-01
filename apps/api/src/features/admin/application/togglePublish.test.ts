import { describe, it, expect, vi } from 'vitest'
import { makeTogglePublish } from './togglePublish'
import type { AdminRepository } from '../types'

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    getDashboardData: vi.fn(),
    markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    togglePublish: vi.fn().mockResolvedValue({ isPublished: false }),
    listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    ...overrides,
  } as unknown as AdminRepository
}

describe('togglePublish', () => {
  it('delegates to repo and returns result', async () => {
    const repo = makeRepo()
    const toggle = makeTogglePublish(repo)
    const result = await toggle('p1')
    expect(repo.togglePublish).toHaveBeenCalledWith('p1')
    expect(result).toEqual({ isPublished: false })
  })
})
