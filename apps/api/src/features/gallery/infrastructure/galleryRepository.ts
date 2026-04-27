import { GallerySection, type PrismaClient } from '@prisma/client'
import type { GalleryItem } from '../types'

const GALLERY_SELECT = {
  id: true,
  imageUrl: true,
  position: true,
} as const

// Репозиторий галереи: читает активные элементы из БД и отдаёт фронту
// в виде { id, imageUrl, position } — отсортированных по полю position
export function makeGalleryRepository(prisma: PrismaClient) {
  function findItems(section: GallerySection): Promise<GalleryItem[]> {
    return prisma.galleryItem.findMany({
      where: { gallery: section, isActive: true },
      orderBy: { position: 'asc' },
      select: GALLERY_SELECT,
    })
  }

  return {
    getHomePreview: () => findItems(GallerySection.HOME_PREVIEW),
    getHomePool: () => findItems(GallerySection.HOME_POOL),
    getCollectionItems: (section: GallerySection) => findItems(section),
  }
}

export type { GalleryRepository } from '../types'
