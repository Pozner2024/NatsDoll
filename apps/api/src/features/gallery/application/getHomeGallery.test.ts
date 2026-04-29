import { describe, it, expect, vi } from 'vitest'
import { makeGetHomeGallery } from './getHomeGallery'
import type { GalleryRepository } from '../types'

const mockRepo: GalleryRepository = {
  getHomePreview: vi.fn(),
  getHomePool: vi.fn(),
  getCollectionItems: vi.fn(),
}

describe('getHomeGallery', () => {
  it('возвращает preview и pool из репозитория', async () => {
    const preview = [{ id: '1', imageUrl: 'https://s3.example.com/1.jpg', position: 1 }]
    const pool = [{ id: '2', imageUrl: 'https://s3.example.com/2.jpg', position: 1 }]

    vi.mocked(mockRepo.getHomePreview).mockResolvedValue(preview)
    vi.mocked(mockRepo.getHomePool).mockResolvedValue(pool)

    const getHomeGallery = makeGetHomeGallery(mockRepo)
    const result = await getHomeGallery()

    expect(result).toEqual({ preview, pool })
  })

  it('возвращает пустые массивы если галерея пустая', async () => {
    vi.mocked(mockRepo.getHomePreview).mockResolvedValue([])
    vi.mocked(mockRepo.getHomePool).mockResolvedValue([])

    const getHomeGallery = makeGetHomeGallery(mockRepo)
    const result = await getHomeGallery()

    expect(result).toEqual({ preview: [], pool: [] })
  })
})
