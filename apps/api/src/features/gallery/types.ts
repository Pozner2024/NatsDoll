import { GallerySection } from '@prisma/client'

export type GalleryItem = {
  id: string
  imageUrl: string
  position: number
}

export type HomeGallery = {
  preview: GalleryItem[]
  pool: GalleryItem[]
}

export interface GalleryRepository {
  getHomePreview(): Promise<GalleryItem[]>
  getHomePool(): Promise<GalleryItem[]>
  getCollectionItems(section: GallerySection): Promise<GalleryItem[]>
}

export type Collection = {
  id: string
  name: string
  items: GalleryItem[]
}

export const COLLECTIONS_CONFIG: { section: GallerySection; id: string; name: string }[] = [
  { section: GallerySection.COLLECTION_1, id: 'collection-1', name: 'Mermaids' },
  { section: GallerySection.COLLECTION_2, id: 'collection-2', name: 'Forest Spirits' },
  { section: GallerySection.COLLECTION_3, id: 'collection-3', name: 'Winter Tales' },
  { section: GallerySection.COLLECTION_4, id: 'collection-4', name: 'Sea Creatures' },
  { section: GallerySection.COLLECTION_5, id: 'collection-5', name: 'Enchanted Garden' },
]
