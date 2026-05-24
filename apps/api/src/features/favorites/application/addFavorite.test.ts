import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAddFavorite } from './addFavorite'
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

describe('addFavorite', () => {
  let repo: FavoritesRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('throws 404 when product not found or soft-deleted', async () => {
    vi.mocked(repo.isProductAvailable).mockResolvedValue(false)
    const addFavorite = makeAddFavorite(repo)
    await expect(addFavorite({ userId: 'u1', productId: 'p1' }))
      .rejects.toMatchObject({ statusCode: 404 })
    expect(repo.upsertFavorite).not.toHaveBeenCalled()
  })

  it('upserts and returns the updated id list', async () => {
    vi.mocked(repo.isProductAvailable).mockResolvedValue(true)
    vi.mocked(repo.listFavoriteIds).mockResolvedValue(['p1', 'p2'])
    const addFavorite = makeAddFavorite(repo)
    const result = await addFavorite({ userId: 'u1', productId: 'p1' })
    expect(repo.upsertFavorite).toHaveBeenCalledWith('u1', 'p1')
    expect(result).toEqual({ favoriteIds: ['p1', 'p2'] })
  })

  it('is idempotent — does not throw if already favorited', async () => {
    vi.mocked(repo.isProductAvailable).mockResolvedValue(true)
    vi.mocked(repo.listFavoriteIds).mockResolvedValue(['p1'])
    const addFavorite = makeAddFavorite(repo)
    await expect(addFavorite({ userId: 'u1', productId: 'p1' })).resolves.toBeDefined()
    await expect(addFavorite({ userId: 'u1', productId: 'p1' })).resolves.toBeDefined()
    expect(repo.upsertFavorite).toHaveBeenCalledTimes(2)
  })
})
