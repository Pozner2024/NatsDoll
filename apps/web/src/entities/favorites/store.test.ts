import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFavoritesStore } from './store'
import * as api from './favoritesApi'
import type { Product } from '@/entities/product'

vi.mock('./favoritesApi')

const p1: Product = { id: 'p1', slug: 'p1', name: 'P1', price: 10, image: null, stock: 5 }
const p2: Product = { id: 'p2', slug: 'p2', name: 'P2', price: 20, image: null, stock: 3 }

describe('favoritesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts empty', () => {
    const store = useFavoritesStore()
    expect(store.count).toBe(0)
    expect(store.items).toEqual([])
    expect(store.isFavorite('p1')).toBe(false)
  })

  it('loads favorites once unless forced', async () => {
    vi.mocked(api.fetchFavorites).mockResolvedValue([p1])
    const store = useFavoritesStore()
    await store.load()
    await store.load()
    expect(api.fetchFavorites).toHaveBeenCalledTimes(1)
    expect(store.isFavorite('p1')).toBe(true)

    await store.load(true)
    expect(api.fetchFavorites).toHaveBeenCalledTimes(2)
  })

  it('stores error when load fails', async () => {
    vi.mocked(api.fetchFavorites).mockRejectedValue(new Error('Network down'))
    const store = useFavoritesStore()
    await store.load()
    expect(store.error).toBe('Network down')
    expect(store.items).toEqual([])
  })

  it('toggle adds optimistically and calls addFavorite when not in list', async () => {
    vi.mocked(api.addFavorite).mockResolvedValue({ favoriteIds: ['p1'] })
    const store = useFavoritesStore()
    const promise = store.toggle(p1)
    expect(store.isFavorite('p1')).toBe(true)
    await promise
    expect(api.addFavorite).toHaveBeenCalledWith('p1')
    expect(api.removeFavorite).not.toHaveBeenCalled()
  })

  it('toggle removes optimistically and calls removeFavorite when already favorited', async () => {
    vi.mocked(api.fetchFavorites).mockResolvedValue([p1, p2])
    vi.mocked(api.removeFavorite).mockResolvedValue({ favoriteIds: ['p2'] })
    const store = useFavoritesStore()
    await store.load()
    const promise = store.toggle(p1)
    expect(store.isFavorite('p1')).toBe(false)
    await promise
    expect(api.removeFavorite).toHaveBeenCalledWith('p1')
  })

  it('reverts optimistic update on error', async () => {
    vi.mocked(api.addFavorite).mockRejectedValue(new Error('Server down'))
    const store = useFavoritesStore()
    await expect(store.toggle(p1)).rejects.toThrow('Server down')
    expect(store.isFavorite('p1')).toBe(false)
    expect(store.error).toBe('Server down')
  })

  it('reset() empties state', async () => {
    vi.mocked(api.fetchFavorites).mockResolvedValue([p1])
    const store = useFavoritesStore()
    await store.load()
    store.reset()
    expect(store.count).toBe(0)
    expect(store.isFavorite('p1')).toBe(false)
  })

  it('isToggling reflects in-flight state', async () => {
    let resolveCall: ((value: { favoriteIds: string[] }) => void) | undefined
    vi.mocked(api.addFavorite).mockReturnValue(new Promise((res) => { resolveCall = res }))
    const store = useFavoritesStore()
    const promise = store.toggle(p1)
    expect(store.isToggling('p1')).toBe(true)
    resolveCall?.({ favoriteIds: ['p1'] })
    await promise
    expect(store.isToggling('p1')).toBe(false)
  })

  it('toggle is a no-op when one is already in flight', async () => {
    let resolveCall: ((value: { favoriteIds: string[] }) => void) | undefined
    vi.mocked(api.addFavorite).mockReturnValue(new Promise((res) => { resolveCall = res }))
    const store = useFavoritesStore()
    const first = store.toggle(p1)
    await store.toggle(p1)
    expect(api.addFavorite).toHaveBeenCalledTimes(1)
    resolveCall?.({ favoriteIds: ['p1'] })
    await first
  })
})
