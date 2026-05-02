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
    vi.mocked(prisma.category.findMany).mockResolvedValue(fake as never)

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

describe('productRepository.findMany', () => {
  it('filters by isPublished and deletedAt and applies pagination', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', slug: 'p-1', name: 'P1', price: { toNumber: () => 10 } as never, images: ['img1'], stock: 1 } as never,
    ])
    vi.mocked(prisma.product.count).mockResolvedValue(1)

    const repo = makeProductRepository(prisma)
    const result = await repo.findMany({ sort: 'newest', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.where).toMatchObject({ isPublished: true, deletedAt: null })
    expect(calledWith.skip).toBe(0)
    expect(calledWith.take).toBe(12)
    expect(calledWith.orderBy).toEqual({ createdAt: 'desc' })
    expect(result.total).toBe(1)
    expect(result.items).toEqual([
      { id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img1', stock: 1 },
    ])
  })

  it('filters by category slug when provided', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ category: 'animals', sort: 'newest', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.where).toMatchObject({
      isPublished: true,
      deletedAt: null,
      category: { slug: 'animals' },
    })
  })

  it('orders by price asc when sort=price-asc', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ sort: 'price-asc', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.orderBy).toEqual({ price: 'asc' })
  })

  it('orders by price desc when sort=price-desc', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ sort: 'price-desc', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.orderBy).toEqual({ price: 'desc' })
  })

  it('computes skip from page and limit', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ sort: 'newest', page: 3, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.skip).toBe(24)
    expect(calledWith.take).toBe(12)
  })

  it('returns null image when images array is empty', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', slug: 'p-1', name: 'P1', price: { toNumber: () => 10 } as never, images: [], stock: 1 } as never,
    ])
    vi.mocked(prisma.product.count).mockResolvedValue(1)

    const repo = makeProductRepository(prisma)
    const result = await repo.findMany({ sort: 'newest', page: 1, limit: 12 })

    expect(result.items[0]!.image).toBeNull()
  })
})
