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
}
