import { ref, onMounted, watch } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const AdminProductItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  price: z.number(),
  stock: z.number(),
  isPublished: z.boolean(),
  image: z.string().nullable(),
  category: z.string(),
  categoryId: z.string(),
})

const AdminProductListResponseSchema = z.object({
  items: z.array(AdminProductItemSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
})

export type AdminProductItem = z.infer<typeof AdminProductItemSchema>
export type AdminProductListResponse = z.infer<typeof AdminProductListResponseSchema>

export type AdminProductInput = {
  name: string
  slug: string
  description: string
  price: number
  stock: number
  categoryId: string
  images: string[]
  messageOptions: string[]
  isPublished: boolean
}

export type AdminListingsFilters = {
  search: string
  categoryId: string
  status: 'all' | 'published' | 'draft'
  page: number
}

export function useAdminListings() {
  const data = ref<AdminProductListResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const filters = ref<AdminListingsFilters>({
    search: '',
    categoryId: '',
    status: 'all',
    page: 1,
  })

  async function load() {
    isLoading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      params.set('page', String(filters.value.page))
      params.set('limit', '12')
      if (filters.value.search) params.set('search', filters.value.search)
      if (filters.value.categoryId) params.set('categoryId', filters.value.categoryId)
      if (filters.value.status !== 'all') params.set('status', filters.value.status)

      const res = await authFetch(`/admin/products?${params}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load products')
        return
      }
      data.value = AdminProductListResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load products'
    } finally {
      isLoading.value = false
    }
  }

  async function togglePublish(id: string) {
    const res = await authFetch(`/admin/products/${id}/toggle-publish`, { method: 'PATCH' })
    if (!res.ok) return
    const { isPublished } = await res.json() as { isPublished: boolean }
    if (data.value) {
      const item = data.value.items.find((p) => p.id === id)
      if (item) item.isPublished = isPublished
    }
  }

  async function deleteProduct(id: string) {
    const res = await authFetch(`/admin/products/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    await load()
  }

  async function moveCategory(id: string, categoryId: string) {
    const res = await authFetch(`/admin/products/${id}/category`, {
      method: 'PATCH',
      json: { categoryId },
    })
    if (!res.ok) return
    await load()
  }

  function setFilter(patch: Partial<AdminListingsFilters>) {
    if (patch.search !== undefined || patch.categoryId !== undefined || patch.status !== undefined) {
      filters.value = { ...filters.value, ...patch, page: 1 }
    } else {
      filters.value = { ...filters.value, ...patch }
    }
  }

  watch(filters, load, { deep: true })
  onMounted(load)

  return { data, isLoading, error, filters, setFilter, togglePublish, deleteProduct, moveCategory, load }
}
