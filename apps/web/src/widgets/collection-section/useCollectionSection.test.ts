import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useCollectionSection } from './useCollectionSection'

vi.mock('./collectionsApi', () => ({
  fetchCollections: vi.fn(),
}))

import { fetchCollections } from './collectionsApi'

const mockFetch = vi.mocked(fetchCollections)

function mountComposable() {
  let result: ReturnType<typeof useCollectionSection>

  const TestComponent = defineComponent({
    setup() {
      result = useCollectionSection()
      return result
    },
    template: '<div />',
  })

  mount(TestComponent)
  return result!
}

const fakeCollections = [
  {
    id: 'collection-1',
    name: 'Mermaids',
    items: [{ id: 'i1', imageUrl: 'https://s3.example.com/1.jpg', position: 1 }],
  },
]

describe('useCollectionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('сразу после mount isLoading true, collections пустые, hasError false', () => {
    let resolve!: (v: typeof fakeCollections) => void
    mockFetch.mockReturnValue(new Promise((r) => { resolve = r }))

    const { collections, isLoading, hasError } = mountComposable()

    expect(collections.value).toEqual([])
    expect(isLoading.value).toBe(true)
    expect(hasError.value).toBe(false)

    resolve(fakeCollections)
  })

  it('после успешной загрузки collections заполнены, isLoading false', async () => {
    mockFetch.mockResolvedValue(fakeCollections)

    const { collections, isLoading, hasError } = mountComposable()

    await flushPromises()

    expect(collections.value).toEqual(fakeCollections)
    expect(isLoading.value).toBe(false)
    expect(hasError.value).toBe(false)
  })

  it('при ошибке hasError true, collections пустые', async () => {
    mockFetch.mockRejectedValue(new Error('HTTP 500'))

    const { collections, isLoading, hasError } = mountComposable()

    await flushPromises()

    expect(collections.value).toEqual([])
    expect(isLoading.value).toBe(false)
    expect(hasError.value).toBe(true)
  })
})
