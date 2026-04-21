import { GallerySection, type PrismaClient } from '@prisma/client'
import { handlePrismaError } from '../../../shared/infrastructure'
import type { GalleryItem } from '../types'

const GALLERY_SELECT = {
  id: true,
  imageUrl: true,
  position: true,
} as const

export function makeGalleryRepository(prisma: PrismaClient) {
  return {
    async getHomePreview(): Promise<GalleryItem[]> {
      try {
        return await prisma.galleryItem.findMany({
          where: { gallery: GallerySection.HOME_PREVIEW, isActive: true },
          orderBy: { position: 'asc' },
          select: GALLERY_SELECT,
        })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async getHomePool(): Promise<GalleryItem[]> {
      try {
        return await prisma.galleryItem.findMany({
          where: { gallery: GallerySection.HOME_POOL, isActive: true },
          orderBy: { position: 'asc' },
          select: GALLERY_SELECT,
        })
      } catch (err) {
        return handlePrismaError(err)
      }
    },
  }
}

export type { GalleryRepository } from '../types'
