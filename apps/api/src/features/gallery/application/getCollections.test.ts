import { describe, it, expect, vi } from 'vitest'
import { GallerySection } from '@prisma/client'
import { makeGetCollections } from './getCollections'
import type { GalleryRepository } from '../types'

const mockItems = [
  { id: 'i1', imageUrl: 'https://s3.example.com/1.jpg', position: 1 },
  { id: 'i2', imageUrl: 'https://s3.example.com/2.jpg', position: 2 },
]

function makeRepo(): GalleryRepository {
  return {
    getHomePreview: vi.fn(),
    getHomePool: vi.fn(),
    getCollectionItems: vi.fn().mockResolvedValue(mockItems),
  }
}

describe('getCollections', () => {
  it('возвращает массив коллекций с name и items', async () => {
    const repo = makeRepo()
    const getCollections = makeGetCollections(repo)

    const result = await getCollections()

    expect(result).toHaveLength(6)
    expect(result[0]).toMatchObject({
      id: 'collection-1',
      name: 'Mermaids',
      items: mockItems,
    })
    expect(result[5]).toMatchObject({
      id: 'collection-6',
      name: 'Halloween',
    })
  })

  it('запрашивает каждую секцию параллельно', async () => {
    const repo = makeRepo()
    const getCollections = makeGetCollections(repo)

    await getCollections()

    expect(repo.getCollectionItems).toHaveBeenCalledTimes(6)
    expect(repo.getCollectionItems).toHaveBeenCalledWith(GallerySection.COLLECTION_1)
    expect(repo.getCollectionItems).toHaveBeenCalledWith(GallerySection.COLLECTION_6)
  })

  it('возвращает пустой items для пустой коллекции', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getCollectionItems).mockResolvedValue([])
    const getCollections = makeGetCollections(repo)

    const result = await getCollections()

    expect(result[0].items).toEqual([])
  })
})
