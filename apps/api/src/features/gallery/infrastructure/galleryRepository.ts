import { Prisma, GallerySection, type PrismaClient } from '@prisma/client'
import type { GalleryItem } from '../types'

const GALLERY_SELECT = {
  id: true,
  imageUrl: true,
  position: true,
} as const

function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Prisma known error:', { code: err.code, meta: err.meta, message: err.message })
    throw new Error('Database error', { cause: err })
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('Prisma unknown error:', err.message)
    throw new Error('Database error', { cause: err })
  }
  throw err
}

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
