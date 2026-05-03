import { describe, it, expect, vi } from 'vitest'
import { makeListProducts } from './listProducts'
import type { ProductRepository } from '../types'

function makeRepo(): ProductRepository {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
    findBySlug: vi.fn(),
  }
}

describe('listProducts', () => {
  it('returns response with totalPages computed from total and limit', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img', stock: 1 }],
      total: 25,
    })

    const listProducts = makeListProducts(repo)
    const result = await listProducts({ sort: 'newest', page: 2, limit: 12 })

    expect(repo.findMany).toHaveBeenCalledWith({ sort: 'newest', page: 2, limit: 12 })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(25)
    expect(result.page).toBe(2)
    expect(result.totalPages).toBe(3)
  })

  it('totalPages is 0 when total is 0', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({ items: [], total: 0 })

    const listProducts = makeListProducts(repo)
    const result = await listProducts({ sort: 'newest', page: 1, limit: 12 })

    expect(result.totalPages).toBe(0)
    expect(result.items).toEqual([])
  })

  it('passes category filter to repository', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({ items: [], total: 0 })

    const listProducts = makeListProducts(repo)
    await listProducts({ category: 'animals', sort: 'price-asc', page: 1, limit: 12 })

    expect(repo.findMany).toHaveBeenCalledWith({ category: 'animals', sort: 'price-asc', page: 1, limit: 12 })
  })
})
