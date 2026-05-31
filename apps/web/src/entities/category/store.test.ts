import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

vi.mock('./categoryApi', () => ({
  fetchCategories: vi.fn(),
}))

import { fetchCategories } from './categoryApi'
import { useCategoryStore } from './store'
import type { Category } from './types'

const mockFetch = vi.mocked(fetchCategories)

describe('categoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state — empty categories, not loading, no error', () => {
    const store = useCategoryStore()
    expect(store.categories).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(false)
  })

  it('load fetches and stores categories', async () => {
    const fake = [{ id: '1', slug: 'a', name: 'A' }]
    mockFetch.mockResolvedValue(fake)

    const store = useCategoryStore()
    await store.load()

    expect(store.categories).toEqual(fake)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(false)
  })

  it('load is idempotent — second call does not refetch', async () => {
    mockFetch.mockResolvedValue([{ id: '1', slug: 'a', name: 'A' }])

    const store = useCategoryStore()
    await store.load()
    await store.load()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('load sets error on failure', async () => {
    mockFetch.mockRejectedValue(new Error('HTTP 500'))

    const store = useCategoryStore()
    await store.load()

    expect(store.error).toBe(true)
    expect(store.categories).toEqual([])
  })

  it('load sets loading=true while fetching', async () => {
    let resolve!: (v: Category[]) => void
    mockFetch.mockReturnValue(new Promise((r) => { resolve = r }))

    const store = useCategoryStore()
    const promise = store.load()

    expect(store.loading).toBe(true)
    resolve([])
    await promise
    await flushPromises()
    expect(store.loading).toBe(false)
  })
})
