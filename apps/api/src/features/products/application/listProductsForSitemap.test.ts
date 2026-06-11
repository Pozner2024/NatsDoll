import { describe, it, expect, vi } from 'vitest'
import { makeListProductsForSitemap } from './listProductsForSitemap'
import type { ProductRepository } from '../types'

function makeRepo(): ProductRepository {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
    findBySlug: vi.fn(),
    findAllForSitemap: vi.fn(),
  }
}

describe('listProductsForSitemap', () => {
  it('delegates to repository', async () => {
    const repo = makeRepo()
    const fake = [
      { slug: 'aurora-doll', updatedAt: new Date('2026-06-01T10:00:00Z') },
      { slug: 'cat-figurine', updatedAt: new Date('2026-05-20T08:00:00Z') },
    ]
    vi.mocked(repo.findAllForSitemap).mockResolvedValue(fake)

    const listProductsForSitemap = makeListProductsForSitemap(repo)
    const result = await listProductsForSitemap()

    expect(result).toEqual(fake)
  })

  it('returns empty array when no products exist', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findAllForSitemap).mockResolvedValue([])

    const listProductsForSitemap = makeListProductsForSitemap(repo)
    const result = await listProductsForSitemap()

    expect(result).toEqual([])
  })
})
