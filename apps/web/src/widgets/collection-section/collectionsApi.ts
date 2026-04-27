import { z } from 'zod'
import { apiFetch } from '@/shared'

const CollectionItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  position: z.number().int().min(1),
})

const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(CollectionItemSchema),
})

const CollectionsSchema = z.array(CollectionSchema)

export type CollectionItem = z.infer<typeof CollectionItemSchema>
export type Collection = z.infer<typeof CollectionSchema>

export async function fetchCollections(): Promise<Collection[]> {
  const res = await apiFetch('/gallery/collections')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return CollectionsSchema.parse(data)
}
