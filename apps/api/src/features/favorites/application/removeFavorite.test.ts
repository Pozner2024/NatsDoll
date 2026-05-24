import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRemoveFavorite } from './removeFavorite'
import type { FavoritesRepository } from '../types'

function makeRepo(): FavoritesRepository {
  return {
    isProductAvailable: vi.fn(),
    upsertFavorite: vi.fn(),
    deleteFavorite: vi.fn(),
    listFavoriteIds: vi.fn(),
    listFavoriteProducts: vi.fn(),
  }
}

describe('removeFavorite', () => {
  let repo: FavoritesRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('deletes and returns the updated id list', async () => {
    vi.mocked(repo.listFavoriteIds).mockResolvedValue(['p2'])
    const removeFavorite = makeRemoveFavorite(repo)
    const result = await removeFavorite({ userId: 'u1', productId: 'p1' })
    expect(repo.deleteFavorite).toHaveBeenCalledWith('u1', 'p1')
    expect(result).toEqual({ favoriteIds: ['p2'] })
  })

  it('is idempotent — succeeds when nothing to delete', async () => {
    vi.mocked(repo.listFavoriteIds).mockResolvedValue([])
    const removeFavorite = makeRemoveFavorite(repo)
    await expect(removeFavorite({ userId: 'u1', productId: 'missing' }))
      .resolves.toEqual({ favoriteIds: [] })
  })
})
