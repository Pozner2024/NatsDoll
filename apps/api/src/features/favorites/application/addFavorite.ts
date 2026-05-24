import { AppError } from '../../../shared/errors'
import type { AddFavorite, FavoritesRepository } from '../types'

export function makeAddFavorite(repo: FavoritesRepository): AddFavorite {
  return async function addFavorite({ userId, productId }) {
    const available = await repo.isProductAvailable(productId)
    if (!available) throw new AppError(404, 'Product not found')

    await repo.upsertFavorite(userId, productId)
    const favoriteIds = await repo.listFavoriteIds(userId)
    return { favoriteIds }
  }
}
