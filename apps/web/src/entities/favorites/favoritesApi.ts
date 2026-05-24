import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'
import type { Product } from '@/entities/product'

const ProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  image: z.string().nullable(),
  stock: z.number().int().min(0),
}) satisfies z.ZodType<Product>

const FavoritesListSchema = z.array(ProductSchema)

const ToggleResultSchema = z.object({
  favoriteIds: z.array(z.string()),
})

export type ToggleResult = z.infer<typeof ToggleResultSchema>

export async function fetchFavorites(signal?: AbortSignal): Promise<Product[]> {
  const res = await authFetch('/favorites', { signal })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load favorites'))
  return FavoritesListSchema.parse(await res.json())
}

export async function addFavorite(productId: string): Promise<ToggleResult> {
  const res = await authFetch(`/favorites/${encodeURIComponent(productId)}`, { method: 'POST' })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to add favorite'))
  return ToggleResultSchema.parse(await res.json())
}

export async function removeFavorite(productId: string): Promise<ToggleResult> {
  const res = await authFetch(`/favorites/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to remove favorite'))
  return ToggleResultSchema.parse(await res.json())
}
