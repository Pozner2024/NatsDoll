import type { ListFavorites, FavoritesRepository } from '../types'

export function makeListFavorites(repo: FavoritesRepository): ListFavorites {
  return async function listFavorites(userId: string) {
    return repo.listFavoriteProducts(userId)
  }
}
