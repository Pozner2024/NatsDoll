import { describe, it, expect, vi } from 'vitest'
import { makeProductRepository } from './productRepository'

function makePrismaMock() {
  return {
    product: { findMany: vi.fn(), count: vi.fn() },
    category: { findMany: vi.fn() },
  } as unknown as Parameters<typeof makeProductRepository>[0]
}

describe('productRepository.listCategories', () => {
  it('returns categories ordered by name', async () => {
    const prisma = makePrismaMock()
    const fake = [
      { id: '1', slug: 'animals', name: 'Animals' },
      { id: '2', slug: 'sweet', name: 'Sweet' },
    ]
    vi.mocked(prisma.category.findMany).mockResolvedValue(fake)

    const repo = makeProductRepository(prisma)
    const result = await repo.listCategories()

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true },
    })
    expect(result).toEqual(fake)
  })

  it('returns empty array when no categories exist', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.category.findMany).mockResolvedValue([])

    const repo = makeProductRepository(prisma)
    const result = await repo.listCategories()

    expect(result).toEqual([])
  })
})
