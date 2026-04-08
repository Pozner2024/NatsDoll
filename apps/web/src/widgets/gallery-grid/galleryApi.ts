import { z } from 'zod'

export const GALLERY_GRID_SIZE = 9

const GalleryItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  position: z.number().int().min(1).max(GALLERY_GRID_SIZE),
})

const GalleryHomeSchema = z.object({
  preview: z.array(GalleryItemSchema),
  pool: z.array(GalleryItemSchema),
})

export type GalleryItem = z.infer<typeof GalleryItemSchema>
export type HomeGallery = z.infer<typeof GalleryHomeSchema>

export async function fetchHomeGallery(): Promise<HomeGallery> {
  const res = await fetch('/api/gallery/home')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return GalleryHomeSchema.parse(data)
}
