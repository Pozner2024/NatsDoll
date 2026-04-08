import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useGalleryGrid } from './useGalleryGrid'

vi.mock('./galleryApi', () => ({
  fetchHomeGallery: vi.fn(),
}))

import { fetchHomeGallery } from './galleryApi'

const mockFetchHomeGallery = vi.mocked(fetchHomeGallery)

function mountComposable() {
  let result: ReturnType<typeof useGalleryGrid>

  const TestComponent = defineComponent({
    setup() {
      result = useGalleryGrid()
      return result
    },
    template: '<div />',
  })

  mount(TestComponent)
  return result!
}

const fakeData = {
  preview: [{ id: '1', imageUrl: 'https://s3.example.com/1.jpg', position: 1 }],
  pool: [{ id: '10', imageUrl: 'https://s3.example.com/10.jpg', position: 1 }],
}

describe('useGalleryGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('сразу после mount isLoading true, preview и pool пустые, hasError false', () => {
    let resolve!: (v: typeof fakeData) => void
    mockFetchHomeGallery.mockReturnValue(new Promise((r) => { resolve = r }))

    const { preview, pool, isLoading, hasError } = mountComposable()

    expect(preview.value).toEqual([])
    expect(pool.value).toEqual([])
    expect(isLoading.value).toBe(true)
    expect(hasError.value).toBe(false)

    resolve(fakeData)
  })

  it('после успешной загрузки preview и pool заполнены, isLoading false, hasError false', async () => {
    mockFetchHomeGallery.mockResolvedValue(fakeData)

    const { preview, pool, isLoading, hasError } = mountComposable()

    await flushPromises()

    expect(preview.value).toEqual(fakeData.preview)
    expect(pool.value).toEqual(fakeData.pool)
    expect(isLoading.value).toBe(false)
    expect(hasError.value).toBe(false)
  })

  it('при ошибке загрузки hasError становится true, preview и pool остаются пустыми', async () => {
    mockFetchHomeGallery.mockRejectedValue(new Error('HTTP 500'))

    const { preview, pool, isLoading, hasError } = mountComposable()

    await flushPromises()

    expect(preview.value).toEqual([])
    expect(pool.value).toEqual([])
    expect(isLoading.value).toBe(false)
    expect(hasError.value).toBe(true)
  })

  it('во время загрузки isLoading true, после завершения false', async () => {
    let resolve!: (v: typeof fakeData) => void
    mockFetchHomeGallery.mockReturnValue(new Promise((r) => { resolve = r }))

    const { isLoading } = mountComposable()

    expect(isLoading.value).toBe(true)

    resolve(fakeData)
    await flushPromises()
    expect(isLoading.value).toBe(false)
  })
})
