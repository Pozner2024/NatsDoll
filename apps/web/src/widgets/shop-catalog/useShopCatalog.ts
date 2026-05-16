import { ref, computed, watch, onScopeDispose } from 'vue'
import { useRoute } from 'vue-router'
import { fetchProducts, type Product, type ProductSortOrder } from '@/entities/product'
import { useCategoryStore } from '@/entities/category'

export const PAGE_SIZE = 12
const VALID_SORTS: ProductSortOrder[] = ['newest', 'price-asc', 'price-desc']

function parseSort(raw: unknown): ProductSortOrder {
  return VALID_SORTS.find((s) => s === raw) ?? 'newest'
}

function parsePage(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useShopCatalog() {
  const route = useRoute()
  const categoryStore = useCategoryStore()

  const category = computed(() => {
    const c = route.params.category
    return typeof c === 'string' && c.length > 0 ? c : undefined
  })
  const sort = computed(() => parseSort(route.query.sort))
  const page = computed(() => parsePage(route.query.page))

  const products = ref<Product[]>([])
  const total = ref(0)
  const totalPages = ref(0)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  let currentController: AbortController | null = null

  async function load() {
    currentController?.abort()
    const controller = new AbortController()
    currentController = controller
    const { signal } = controller

    isLoading.value = true
    error.value = null
    try {
      const res = await fetchProducts({
        category: category.value,
        sort: sort.value,
        page: page.value,
        limit: PAGE_SIZE,
      }, signal)
      if (signal.aborted) return
      products.value = res.items
      total.value = res.total
      totalPages.value = res.totalPages
    } catch (e) {
      if (signal.aborted || isAbortError(e)) return
      error.value = e instanceof Error ? e : new Error(String(e))
      products.value = []
      total.value = 0
      totalPages.value = 0
    } finally {
      if (!signal.aborted) isLoading.value = false
    }
  }

  watch([category, sort, page], () => { void load() }, { immediate: true })

  void categoryStore.load()

  onScopeDispose(() => currentController?.abort())

  async function retry() {
    await Promise.all([load(), categoryStore.load()])
  }

  const activeCategoryName = computed(() => {
    if (!category.value) return null
    return categoryStore.categories.find((c) => c.slug === category.value)?.name ?? null
  })

  return {
    category,
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
