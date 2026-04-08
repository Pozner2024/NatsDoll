export type GalleryItem = {
  id: string
  imageUrl: string
  position: number
}

export interface GalleryRepository {
  getHomePreview(): Promise<GalleryItem[]>
  getHomePool(): Promise<GalleryItem[]>
}
