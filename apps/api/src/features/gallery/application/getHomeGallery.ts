import type { GalleryItem, GalleryRepository } from '../types'

type HomeGallery = { preview: GalleryItem[]; pool: GalleryItem[] }

export function makeGetHomeGallery(repo: GalleryRepository) {
  return async function getHomeGallery(): Promise<HomeGallery> {
    const [preview, pool] = await Promise.all([
      repo.getHomePreview(),
      repo.getHomePool(),
    ])
    return { preview, pool }
  }
}
