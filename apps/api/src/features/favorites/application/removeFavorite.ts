import type { RemoveFavorite, FavoritesRepository } from '../types'

export function makeRemoveFavorite(repo: FavoritesRepository): RemoveFavorite {
  return async function removeFavorite({ userId, productId }) {
    await repo.deleteFavorite(userId, productId)
    const favoriteIds = await repo.listFavoriteIds(userId)
    return { favoriteIds }
  }
}
