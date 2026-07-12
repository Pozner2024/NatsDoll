import { describe, it, expect, vi } from 'vitest'
import { makeCleanupOrphanImages } from './cleanupOrphanImages'
import type { S3ObjectInfo } from '../../../shared/lib'

const DAY_MS = 24 * 60 * 60 * 1000

function obj(key: string, ageMs: number): S3ObjectInfo {
  return { key, url: `https://s3/bucket/${key}`, lastModified: new Date(Date.now() - ageMs) }
}

describe('cleanupOrphanImages', () => {
  it('удаляет только старые объекты, не привязанные к товарам', async () => {
    const orphanOld = obj('items/new/orphan.webp', 2 * DAY_MS)
    const orphanFresh = obj('items/new/fresh.webp', 60_000)
    const used = obj('items/new/used.webp', 2 * DAY_MS)
    const list = vi.fn().mockResolvedValue([orphanOld, orphanFresh, used])
    const remove = vi.fn().mockResolvedValue(undefined)
    const getUrls = vi.fn().mockResolvedValue([used.url])

    const result = await makeCleanupOrphanImages(list, remove, getUrls)()

    expect(list).toHaveBeenCalledWith('items/')
    expect(remove).toHaveBeenCalledWith([orphanOld.key])
    expect(result).toEqual({ deleted: 1 })
  })

  it('матчит использованные объекты и по virtual-hosted URL (без имени бакета в пути)', async () => {
    const used = obj('items/new/used.webp', 2 * DAY_MS)
    const list = vi.fn().mockResolvedValue([used])
    const remove = vi.fn().mockResolvedValue(undefined)
    const getUrls = vi.fn().mockResolvedValue(['https://bucket.storage.example/items/new/used.webp'])

    const result = await makeCleanupOrphanImages(list, remove, getUrls)()

    expect(remove).toHaveBeenCalledWith([])
    expect(result).toEqual({ deleted: 0 })
  })

  it('не трогает объекты без lastModified', async () => {
    const noDate: S3ObjectInfo = { key: 'items/x.webp', url: 'https://s3/bucket/items/x.webp', lastModified: null }
    const list = vi.fn().mockResolvedValue([noDate])
    const remove = vi.fn().mockResolvedValue(undefined)
    const getUrls = vi.fn().mockResolvedValue([])

    const result = await makeCleanupOrphanImages(list, remove, getUrls)()

    expect(remove).toHaveBeenCalledWith([])
    expect(result).toEqual({ deleted: 0 })
  })
})
