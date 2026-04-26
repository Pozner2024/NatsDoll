import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GallerySection, type PrismaClient } from '@prisma/client'
import { makeGalleryRepository } from './galleryRepository'

const mockFindMany = vi.fn()
const mockPrisma = {
  galleryItem: { findMany: mockFindMany },
} as unknown as PrismaClient

describe('galleryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getHomePreview', () => {
    it('возвращает активные элементы HOME_PREVIEW отсортированные по position', async () => {
      const items = [
        { id: '1', imageUrl: 'https://s3.example.com/1.jpg', position: 1 },
        { id: '2', imageUrl: 'https://s3.example.com/2.jpg', position: 2 },
      ]
      mockFindMany.mockResolvedValue(items)

      const repo = makeGalleryRepository(mockPrisma)
      const result = await repo.getHomePreview()

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { gallery: GallerySection.HOME_PREVIEW, isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, imageUrl: true, position: true },
      })
      expect(result).toEqual(items)
    })
  })

  describe('getHomePool', () => {
    it('возвращает активные элементы HOME_POOL отсортированные по position', async () => {
      const items = [
        { id: '3', imageUrl: 'https://s3.example.com/3.jpg', position: 1 },
      ]
      mockFindMany.mockResolvedValue(items)

      const repo = makeGalleryRepository(mockPrisma)
      const result = await repo.getHomePool()

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { gallery: GallerySection.HOME_POOL, isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, imageUrl: true, position: true },
      })
      expect(result).toEqual(items)
    })
  })
})

describe('getCollectionItems', () => {
  it('возвращает активные элементы коллекции, отсортированные по position', async () => {
    const mockItems = [
      { id: 'c1', imageUrl: 'https://s3.example.com/c1.jpg', position: 1 },
      { id: 'c2', imageUrl: 'https://s3.example.com/c2.jpg', position: 2 },
    ]

    const mockPrisma = {
      galleryItem: {
        findMany: vi.fn().mockResolvedValue(mockItems),
      },
    } as unknown as PrismaClient

    const repo = makeGalleryRepository(mockPrisma)
    const result = await repo.getCollectionItems(GallerySection.COLLECTION_1)

    expect(mockPrisma.galleryItem.findMany).toHaveBeenCalledWith({
      where: { gallery: GallerySection.COLLECTION_1, isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, imageUrl: true, position: true },
    })
    expect(result).toEqual(mockItems)
  })
})
