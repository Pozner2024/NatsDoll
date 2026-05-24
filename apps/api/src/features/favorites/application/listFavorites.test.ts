import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeListFavorites } from './listFavorites'
import type { FavoritesRepository, FavoriteProduct } from '../types'

function makeRepo(): FavoritesRepository {
  return {
    isProductAvailable: vi.fn(),
    upsertFavorite: vi.fn(),
    deleteFavorite: vi.fn(),
    listFavoriteIds: vi.fn(),
    listFavoriteProducts: vi.fn(),
  }
}

describe('listFavorites', () => {
  let repo: FavoritesRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('returns favorite products from the repository', async () => {
    const items: FavoriteProduct[] = [
      { id: 'p1', slug: 'p1', name: 'P1', price: 10, image: null, stock: 5 },
    ]
    vi.mocked(repo.listFavoriteProducts).mockResolvedValue(items)
    const listFavorites = makeListFavorites(repo)
    const result = await listFavorites('u1')
    expect(result).toEqual(items)
    expect(repo.listFavoriteProducts).toHaveBeenCalledWith('u1')
  })

  it('returns empty list when user has no favorites', async () => {
    vi.mocked(repo.listFavoriteProducts).mockResolvedValue([])
    const listFavorites = makeListFavorites(repo)
    expect(await listFavorites('u1')).toEqual([])
  })
})
