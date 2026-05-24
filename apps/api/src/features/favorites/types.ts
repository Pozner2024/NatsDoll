import type { ProductListItem } from '../products/types'

export type FavoriteProduct = ProductListItem

export type ToggleResult = {
  favoriteIds: string[]
}

export type AddFavoriteParams = {
  userId: string
  productId: string
}

export type RemoveFavoriteParams = {
  userId: string
  productId: string
}

export type AddFavorite = (params: AddFavoriteParams) => Promise<ToggleResult>
export type RemoveFavorite = (params: RemoveFavoriteParams) => Promise<ToggleResult>
export type ListFavorites = (userId: string) => Promise<FavoriteProduct[]>

export interface FavoritesRepository {
  isProductAvailable(productId: string): Promise<boolean>
  upsertFavorite(userId: string, productId: string): Promise<void>
  deleteFavorite(userId: string, productId: string): Promise<void>
  listFavoriteIds(userId: string): Promise<string[]>
  listFavoriteProducts(userId: string): Promise<FavoriteProduct[]>
}
