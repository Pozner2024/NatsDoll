import { describe, it, expect, vi } from 'vitest'
import { makeListProductsForPinterest } from './listProductsForPinterest'
import type { ProductRepository } from '../types'

function makeRepo(): ProductRepository {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
    findBySlug: vi.fn(),
    findAllForSitemap: vi.fn(),
    findAllForPinterest: vi.fn(),
  }
}

describe('listProductsForPinterest', () => {
  it('delegates to repository', async () => {
    const repo = makeRepo()
    const fake = [
      {
        id: 'p1',
        slug: 'aurora-doll',
        name: 'Aurora Doll',
        description: 'Handmade doll',
        image: 'https://example.com/1.webp',
        categorySlug: 'art-dolls',
        createdAt: new Date('2026-06-01T10:00:00Z'),
      },
    ]
    vi.mocked(repo.findAllForPinterest).mockResolvedValue(fake)

    const listProductsForPinterest = makeListProductsForPinterest(repo)
    const result = await listProductsForPinterest()

    expect(result).toEqual(fake)
  })
})
