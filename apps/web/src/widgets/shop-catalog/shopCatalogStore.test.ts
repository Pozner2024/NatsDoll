import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/entities/category', () => ({
  fetchCategories: vi.fn(),
}))

import { fetchCategories } from '@/entities/category'
import { useShopCatalogStore } from './shopCatalogStore'

const mockFetch = vi.mocked(fetchCategories)

describe('shopCatalogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state — empty categories, not loading, no error', () => {
    const store = useShopCatalogStore()
    expect(store.categories).toEqual([])
    expect(store.categoriesLoading).toBe(false)
    expect(store.categoriesError).toBe(false)
  })

  it('loadCategories fetches and stores categories', async () => {
    const fake = [{ id: '1', slug: 'a', name: 'A' }]
    mockFetch.mockResolvedValue(fake)

    const store = useShopCatalogStore()
    await store.loadCategories()

    expect(store.categories).toEqual(fake)
    expect(store.categoriesLoading).toBe(false)
    expect(store.categoriesError).toBe(false)
  })

  it('loadCategories is idempotent — second call does not refetch', async () => {
    mockFetch.mockResolvedValue([{ id: '1', slug: 'a', name: 'A' }])

    const store = useShopCatalogStore()
    await store.loadCategories()
    await store.loadCategories()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('loadCategories sets categoriesError on failure', async () => {
    mockFetch.mockRejectedValue(new Error('HTTP 500'))

    const store = useShopCatalogStore()
    await store.loadCategories()

    expect(store.categoriesError).toBe(true)
    expect(store.categories).toEqual([])
  })

  it('loadCategories sets categoriesLoading=true while fetching', async () => {
    let resolve!: (v: unknown) => void
    mockFetch.mockReturnValue(new Promise((r) => { resolve = r }))

    const store = useShopCatalogStore()
    const promise = store.loadCategories()

    expect(store.categoriesLoading).toBe(true)
    resolve([])
    await promise
    await flushPromises()
    expect(store.categoriesLoading).toBe(false)
  })
})
