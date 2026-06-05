import { describe, it, expect, vi } from 'vitest'
import { makeListProducts } from './listProducts'
import type { ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'

const noSale: GetActiveSale = async () => null
const allSale20: GetActiveSale = async () => ({ discount: 20, scope: 'ALL', categoryIds: [], productIds: [] })

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
      items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img', stock: 1, categoryId: 'cat1' }],
      total: 25,
    })

    const listProducts = makeListProducts(repo, noSale)
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

    const listProducts = makeListProducts(repo, noSale)
    const result = await listProducts({ sort: 'newest', page: 1, limit: 12 })

    expect(result.totalPages).toBe(0)
    expect(result.items).toEqual([])
  })

  it('passes category filter to repository', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({ items: [], total: 0 })

    const listProducts = makeListProducts(repo, noSale)
    await listProducts({ category: 'animals', sort: 'price-asc', page: 1, limit: 12 })

    expect(repo.findMany).toHaveBeenCalledWith({ category: 'animals', sort: 'price-asc', page: 1, limit: 12 })
  })

  it('enriches items with salePrice and salePercent when ALL sale is active', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 100, image: null, stock: 1, categoryId: 'cat1' }],
      total: 1,
    })

    const listProducts = makeListProducts(repo, allSale20)
    const result = await listProducts({ sort: 'newest', page: 1, limit: 12 })

    expect(result.items[0].salePrice).toBe(80)
    expect(result.items[0].salePercent).toBe(20)
  })

  it('does not enrich items when no sale is active', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 100, image: null, stock: 1, categoryId: 'cat1' }],
      total: 1,
    })

    const listProducts = makeListProducts(repo, noSale)
    const result = await listProducts({ sort: 'newest', page: 1, limit: 12 })

    expect(result.items[0].salePrice).toBeUndefined()
    expect(result.items[0].salePercent).toBeUndefined()
  })

  it('enriches only items matching CATEGORIES scope', async () => {
    const sale: GetActiveSale = async () => ({
      discount: 10,
      scope: 'CATEGORIES',
      categoryIds: ['cat1'],
      productIds: [],
    })
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [
        { id: 'p1', slug: 'p-1', name: 'P1', price: 100, image: null, stock: 1, categoryId: 'cat1' },
        { id: 'p2', slug: 'p-2', name: 'P2', price: 100, image: null, stock: 1, categoryId: 'cat2' },
      ],
      total: 2,
    })

    const listProducts = makeListProducts(repo, sale)
    const result = await listProducts({ sort: 'newest', page: 1, limit: 12 })

    expect(result.items[0].salePrice).toBe(90)
    expect(result.items[1].salePrice).toBeUndefined()
  })
})
