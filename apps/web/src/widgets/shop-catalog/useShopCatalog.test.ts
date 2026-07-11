import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, Suspense } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/entities/product', () => ({
  fetchProducts: vi.fn(),
}))
vi.mock('@/entities/category/categoryApi', () => ({
  fetchCategories: vi.fn(),
}))

import { fetchProducts } from '@/entities/product'
import { fetchCategories } from '@/entities/category/categoryApi'
import { useShopCatalog } from './useShopCatalog'

const mockFetch = vi.mocked(fetchProducts)
const mockCategories = vi.mocked(fetchCategories)

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

  let api: Awaited<ReturnType<typeof useShopCatalog>> | undefined
  let thrown: unknown = null
  const Inner = defineComponent({
    async setup() {
      try {
        api = await useShopCatalog()
      } catch (e) {
        thrown = e
      }
      return () => h('div')
    },
  })
  const Root = defineComponent({
    setup: () => () => h(Suspense, null, { default: () => h(Inner) }),
  })
  mount(Root, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return { api: api!, router, thrown }
}

describe('useShopCatalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFetch.mockResolvedValue(sampleResponse)
    mockCategories.mockResolvedValue([{ id: 'c1', slug: 'animals', name: 'Animals' }])
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

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'newest' }),
    )
  })

  it('falls back to page=1 for invalid page', async () => {
    await mountComposable('/shop?page=abc')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    )
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

  it('requests onSale=true and no category for /shop/on-sale', async () => {
    const { api } = await mountComposable('/shop/on-sale')

    expect(mockFetch).toHaveBeenCalledWith({
      category: undefined,
      onSale: true,
      sort: 'newest',
      page: 1,
      limit: 12,
    })
    expect(api.activeCategoryName.value).toBe('On Sale')
  })

  it('throws 404 createError for unknown category slug', async () => {
    const { thrown } = await mountComposable('/shop/no-such-category')

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as { statusCode?: number }).statusCode).toBe(404)
  })

  it('does not throw for a known category slug', async () => {
    const { thrown } = await mountComposable('/shop/animals')

    expect(thrown).toBe(null)
  })

  it('does not throw while categories are not loaded yet (fail-open)', async () => {
    mockCategories.mockResolvedValue([])

    const { thrown } = await mountComposable('/shop/no-such-category')

    expect(thrown).toBe(null)
  })

  it('does not throw when categories failed to load (fail-open)', async () => {
    mockCategories.mockRejectedValue(new Error('HTTP 500'))

    const { thrown, api } = await mountComposable('/shop/no-such-category')

    expect(thrown).toBe(null)
    expect(api.products.value).toEqual(sampleResponse.items)
  })

  it('refetches when category changes', async () => {
    const { router } = await mountComposable('/shop')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await router.push('/shop/animals')
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'animals' }),
    )
  })
})
