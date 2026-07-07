import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAsyncData } from 'nuxt/app'
import { fetchProducts, type ProductSortOrder } from '@/entities/product'
import { useCategoryStore } from '@/entities/category'

export const PAGE_SIZE = 12
export const ON_SALE_SLUG = 'on-sale'
const VALID_SORTS: ProductSortOrder[] = ['newest', 'price-asc', 'price-desc']

function parseSort(raw: unknown): ProductSortOrder {
  return VALID_SORTS.find((s) => s === raw) ?? 'newest'
}

function parsePage(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function useShopCatalog() {
  const route = useRoute()
  const categoryStore = useCategoryStore()

  const routeParam = computed(() => {
    const c = route.params.category
    return typeof c === 'string' && c.length > 0 ? c : undefined
  })
  const onSale = computed(() => routeParam.value === ON_SALE_SLUG)
  const category = computed(() => (onSale.value ? undefined : routeParam.value))
  const sort = computed(() => parseSort(route.query.sort))
  const page = computed(() => parsePage(route.query.page))

  const { data, status, error: fetchError, refresh } = useAsyncData(
    computed(() => `shop-products:${routeParam.value ?? 'all'}:${sort.value}:${page.value}`),
    () => fetchProducts({
      category: category.value,
      onSale: onSale.value || undefined,
      sort: sort.value,
      page: page.value,
      limit: PAGE_SIZE,
    }),
  )

  void categoryStore.load()

  const products = computed(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const totalPages = computed(() => data.value?.totalPages ?? 0)
  const isLoading = computed(() => status.value === 'pending')
  const error = computed<Error | null>(() => {
    const e = fetchError.value
    if (!e) return null
    return e instanceof Error ? e : new Error(String(e))
  })

  async function retry() {
    await Promise.all([refresh(), categoryStore.load()])
  }

  const activeCategoryName = computed(() => {
    if (onSale.value) return 'On Sale'
    if (!category.value) return null
    return categoryStore.categories.find((c) => c.slug === category.value)?.name ?? null
  })

  return {
    category: computed(() => routeParam.value),
    sort,
    page,
    products,
    total,
    totalPages,
    isLoading,
    error,
    categories: computed(() => categoryStore.categories),
    categoriesError: computed(() => categoryStore.error),
    activeCategoryName,
    retry,
  }
}
