import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchHomeGallery } from './galleryApi'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  }
}

const previewItems = [
  { id: '1', imageUrl: 'https://s3.example.com/1.jpg', position: 1 },
  { id: '2', imageUrl: 'https://s3.example.com/2.jpg', position: 2 },
]
const poolItems = [
  { id: '10', imageUrl: 'https://s3.example.com/10.jpg', position: 1 },
  { id: '11', imageUrl: 'https://s3.example.com/11.jpg', position: 2 },
]

describe('fetchHomeGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('возвращает { preview, pool } при успешном ответе', async () => {
    mockFetch.mockResolvedValue(makeResponse({ preview: previewItems, pool: poolItems }))

    const result = await fetchHomeGallery()

    expect(mockFetch).toHaveBeenCalledWith('/api/gallery/home')
    expect(result.preview).toEqual(previewItems)
    expect(result.pool).toEqual(poolItems)
  })

  it('выбрасывает ошибку при HTTP-ошибке (404)', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, false, 404))

    await expect(fetchHomeGallery()).rejects.toThrow('HTTP 404')
  })

  it('выбрасывает ошибку при HTTP-ошибке (500)', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, false, 500))

    await expect(fetchHomeGallery()).rejects.toThrow('HTTP 500')
  })

  it('выбрасывает ошибку если нет поля preview', async () => {
    mockFetch.mockResolvedValue(makeResponse({ pool: poolItems }))

    await expect(fetchHomeGallery()).rejects.toThrow()
  })

  it('выбрасывает ошибку если нет поля pool', async () => {
    mockFetch.mockResolvedValue(makeResponse({ preview: previewItems }))

    await expect(fetchHomeGallery()).rejects.toThrow()
  })

  it('выбрасывает ошибку если imageUrl не строка', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ preview: [{ id: '1', imageUrl: 123, position: 1 }], pool: [] }),
    )

    await expect(fetchHomeGallery()).rejects.toThrow()
  })

  it('выбрасывает ошибку если position вне диапазона 1–9', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ preview: [{ id: '1', imageUrl: 'https://s3.example.com/1.jpg', position: 0 }], pool: [] }),
    )

    await expect(fetchHomeGallery()).rejects.toThrow()
  })

  it('возвращает пустые массивы если preview и pool пустые', async () => {
    mockFetch.mockResolvedValue(makeResponse({ preview: [], pool: [] }))

    const result = await fetchHomeGallery()

    expect(result.preview).toEqual([])
    expect(result.pool).toEqual([])
  })
})
