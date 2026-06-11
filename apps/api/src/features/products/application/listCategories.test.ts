import { describe, it, expect, vi } from 'vitest'
import { makeListCategories } from './listCategories'
import type { ProductRepository } from '../types'

function makeRepo(): ProductRepository {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
    findBySlug: vi.fn(),
    findAllForSitemap: vi.fn(),
  }
}

describe('listCategories', () => {
  it('delegates to repository', async () => {
    const repo = makeRepo()
    const fake = [
      { id: '1', slug: 'animals', name: 'Animals' },
      { id: '2', slug: 'sweet', name: 'Sweet' },
    ]
    vi.mocked(repo.listCategories).mockResolvedValue(fake)

    const listCategories = makeListCategories(repo)
    const result = await listCategories()

    expect(result).toEqual(fake)
  })

  it('returns empty array when no categories exist', async () => {
    const repo = makeRepo()
    vi.mocked(repo.listCategories).mockResolvedValue([])

    const listCategories = makeListCategories(repo)
    const result = await listCategories()

    expect(result).toEqual([])
  })
})
