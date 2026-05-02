import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/entities/product', () => ({
  fetchProducts: vi.fn(),
}))
vi.mock('@/entities/category/categoryApi', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchProducts } from '@/entities/product'
import { useShopCatalog } from './useShopCatalog'

const mockFetch = vi.mocked(fetchProducts)

const sampleResponse = {
  items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: null, stock: 1 }],
  total: 1,
  page: 1,
  totalPages: 1,
}

async function mountComposable(initialPath = '/shop') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: { template: '<div />' } },
    ],
  })
  await router.push(initialPath)

  let api: ReturnType<typeof useShopCatalog>
  const Comp = defineComponent({
    setup() { api = useShopCatalog(); return () => h('div') },
  })
  mount(Comp, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return { api: api!, router }
}

describe('useShopCatalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFetch.mockResolvedValue(sampleResponse)
  })

  it('fetches products on mount with default params from URL /shop', async () => {
    await mountComposable('/shop')

    expect(mockFetch).toHaveBeenCalledWith({
      category: undefined,
      sort: 'newest',
      page: 1,
      limit: 12,
    })
  })

  it('reads category from route params', async () => {
    await mountComposable('/shop/animals')

    expect(mockFetch).toHaveBeenCalledWith({
      category: 'animals',
      sort: 'newest',
      page: 1,
      limit: 12,
    })
  })

  it('reads sort and page from query', async () => {
    await mountComposable('/shop?sort=price-asc&page=2')

    expect(mockFetch).toHaveBeenCalledWith({
      category: undefined,
      sort: 'price-asc',
      page: 2,
      limit: 12,
    })
  })

  it('falls back to defaults for invalid sort', async () => {
    await mountComposable('/shop?sort=garbage')

    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ sort: 'newest' }))
  })

  it('falls back to page=1 for invalid page', async () => {
    await mountComposable('/shop?page=abc')

    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('exposes products, total, totalPages, isLoading, error after fetch', async () => {
    const { api } = await mountComposable('/shop')

    expect(api.products.value).toEqual(sampleResponse.items)
    expect(api.total.value).toBe(1)
    expect(api.totalPages.value).toBe(1)
    expect(api.isLoading.value).toBe(false)
    expect(api.error.value).toBe(null)
  })

  it('sets error and clears products when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('HTTP 500'))

    const { api } = await mountComposable('/shop')

    expect(api.error.value).toBeInstanceOf(Error)
    expect(api.products.value).toEqual([])
  })

  it('refetches when category changes', async () => {
    const { router } = await mountComposable('/shop')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await router.push('/shop/animals')
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'animals' }))
  })

  it('race condition: keeps result of latest call when two fetches overlap', async () => {
    let resolveFirst!: (v: typeof sampleResponse) => void
    let resolveSecond!: (v: typeof sampleResponse) => void

    mockFetch
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r }))
      .mockReturnValueOnce(new Promise((r) => { resolveSecond = r }))

    const { api, router } = await mountComposable('/shop')
    await router.push('/shop/animals')
    await flushPromises()

    const second = { ...sampleResponse, items: [{ ...sampleResponse.items[0]!, id: 'second' }] }
    const first = { ...sampleResponse, items: [{ ...sampleResponse.items[0]!, id: 'first' }] }

    resolveSecond(second)
    await flushPromises()
    resolveFirst(first)
    await flushPromises()

    expect(api.products.value[0]!.id).toBe('second')
  })
})
