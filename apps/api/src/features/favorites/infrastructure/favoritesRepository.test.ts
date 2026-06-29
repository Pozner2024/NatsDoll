import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFavoritesRepository } from './favoritesRepository'

function makePrisma() {
  return {
    product: { findFirst: vi.fn() },
    favorite: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  } as unknown as Parameters<typeof makeFavoritesRepository>[0]
}

let prisma: ReturnType<typeof makePrisma>
beforeEach(() => { prisma = makePrisma() })

describe('favoritesRepository.isProductAvailable', () => {
  it('true, когда товар опубликован и не удалён', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: 'p1' } as never)
    const repo = makeFavoritesRepository(prisma)
    expect(await repo.isProductAvailable('p1')).toBe(true)
  })

  it('false, когда товар не найден', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null as never)
    const repo = makeFavoritesRepository(prisma)
    expect(await repo.isProductAvailable('p1')).toBe(false)
  })
})

describe('favoritesRepository.listFavoriteIds', () => {
  it('возвращает только productId', async () => {
    vi.mocked(prisma.favorite.findMany).mockResolvedValue([
      { productId: 'a' }, { productId: 'b' },
    ] as never)
    const repo = makeFavoritesRepository(prisma)
    expect(await repo.listFavoriteIds('u1')).toEqual(['a', 'b'])
  })
})

describe('favoritesRepository.listFavoriteProducts', () => {
  it('маппит price.toNumber() и первое изображение (или null)', async () => {
    vi.mocked(prisma.favorite.findMany).mockResolvedValue([
      { product: { id: 'p1', slug: 'p-1', name: 'P1', price: { toNumber: () => 10 }, images: ['img1'], stock: 3 } },
      { product: { id: 'p2', slug: 'p-2', name: 'P2', price: { toNumber: () => 20 }, images: [], stock: 0 } },
    ] as never)
    const repo = makeFavoritesRepository(prisma)
    expect(await repo.listFavoriteProducts('u1')).toEqual([
      { id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img1', stock: 3 },
      { id: 'p2', slug: 'p-2', name: 'P2', price: 20, image: null, stock: 0 },
    ])
  })
})
