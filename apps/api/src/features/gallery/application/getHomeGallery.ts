import type { GalleryRepository, HomeGallery } from '../types'

// Собирает данные для главной страницы: превью-товар и пул товаров для ленты.
// Оба запроса выполняются параллельно через Promise.all.
export function makeGetHomeGallery(repo: GalleryRepository) {
  return async function getHomeGallery(): Promise<HomeGallery> {
    const [preview, pool] = await Promise.all([
      repo.getHomePreview(),
      repo.getHomePool(),
    ])
    return { preview, pool }
  }
}
