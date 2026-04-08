import { GallerySection, type PrismaClient } from '@prisma/client'
import type { GalleryItem } from '../types'

const GALLERY_SELECT = {
  id: true,
  imageUrl: true,
  position: true,
} as const

export function makeGalleryRepository(prisma: PrismaClient) {
  return {
    async getHomePreview(): Promise<GalleryItem[]> {
      return prisma.galleryItem.findMany({
        where: { gallery: GallerySection.HOME_PREVIEW, isActive: true },
        orderBy: { position: 'asc' },
        select: GALLERY_SELECT,
      })
    },

    async getHomePool(): Promise<GalleryItem[]> {
      return prisma.galleryItem.findMany({
        where: { gallery: GallerySection.HOME_POOL, isActive: true },
        orderBy: { position: 'asc' },
        select: GALLERY_SELECT,
      })
    },
  }
}

export type { GalleryRepository } from '../types'
