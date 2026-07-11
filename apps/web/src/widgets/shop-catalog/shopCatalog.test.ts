import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, Suspense } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/entities/product', async (orig) => {
  const actual = await orig<typeof import('@/entities/product')>()
  return { ...actual, fetchProducts: vi.fn() }
})
vi.mock('@/entities/category/categoryApi', () => ({
  fetchCategories: vi.fn(),
}))

import { fetchProducts } from '@/entities/product'
import { fetchCategories } from '@/entities/category/categoryApi'
import ShopCatalog from './ShopCatalog.vue'

const mockFetchProducts = vi.mocked(fetchProducts)
const mockFetchCategories = vi.mocked(fetchCategories)

const sample = {
  items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: null, stock: 1 }],
  total: 1,
  page: 1,
  totalPages: 1,
}

const ShopCatalogSuspended = defineComponent({
  setup: () => () => h(Suspense, null, { default: () => h(ShopCatalog) }),
})

async function mountShop(initialPath = '/shop') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: ShopCatalog },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push(initialPath)
  const wrapper = mount(ShopCatalogSuspended, {
    global: { plugins: [createPinia(), router] },
  })
  await flushPromises()
  return wrapper
}

describe('ShopCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchCategories.mockResolvedValue([
      { id: 'c1', slug: 'animals', name: 'Animals' },
    ])
  })

  it('renders skeleton on first load while products empty and loading', async () => {
    let resolve!: (v: typeof sample) => void
    mockFetchProducts.mockReturnValue(new Promise((r) => { resolve = r }))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/shop/:category?', name: 'shop', component: ShopCatalog },
      ],
    })
    await router.push('/shop')
    const wrapper = mount(ShopCatalogSuspended, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.find('.shop-skeleton').exists()).toBe(true)

    resolve(sample)
    await flushPromises()
  })

  it('renders header "The shop" without breadcrumb on /shop', async () => {
    mockFetchProducts.mockResolvedValue(sample)
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.shop-catalog__title').text()).toBe('THE SHOP')
    expect(wrapper.find('.shop-catalog__crumb').exists()).toBe(false)
  })

  it('renders breadcrumb "The shop / Animals" on /shop/animals', async () => {
    mockFetchProducts.mockResolvedValue(sample)
    const wrapper = await mountShop('/shop/animals')
    expect(wrapper.find('.shop-catalog__crumb').text()).toContain('The shop')
    expect(wrapper.find('.shop-catalog__crumb').text()).toContain('Animals')
  })

  it('renders products grid when products exist', async () => {
    mockFetchProducts.mockResolvedValue(sample)
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.products-grid').exists()).toBe(true)
    expect(wrapper.findAll('.product-card')).toHaveLength(1)
  })

  it('renders EmptyState when total === 0 and no error', async () => {
    mockFetchProducts.mockResolvedValue({ ...sample, items: [], total: 0, totalPages: 0 })
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.products-grid').exists()).toBe(false)
    expect(wrapper.find('.sort-control').exists()).toBe(false)
  })

  it('renders ErrorBar when fetch fails on first load (no products yet)', async () => {
    mockFetchProducts.mockRejectedValue(new Error('HTTP 500'))
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.error-bar').exists()).toBe(true)
    expect(wrapper.find('.products-grid').exists()).toBe(false)
  })

  it('shows pills even when error occurs (so user can switch category)', async () => {
    mockFetchProducts.mockRejectedValue(new Error('HTTP 500'))
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.category-pills').exists()).toBe(true)
  })
})
