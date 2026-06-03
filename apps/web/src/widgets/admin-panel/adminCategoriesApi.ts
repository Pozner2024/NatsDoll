import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const AdminCategoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  productCount: z.number(),
})

export type AdminCategoryItem = z.infer<typeof AdminCategoryItemSchema>

export function useAdminCategories() {
  const categories = ref<AdminCategoryItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch('/admin/categories')
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load categories')
        return
      }
      categories.value = z.array(AdminCategoryItemSchema).parse(await res.json())
    } catch {
      error.value = 'Failed to load categories'
    } finally {
      isLoading.value = false
    }
  }

  async function createCategory(name: string): Promise<boolean> {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const res = await authFetch('/admin/categories', {
      method: 'POST',
      json: { name, slug },
    })
    if (!res.ok) return false
    await load()
    return true
  }

  async function updateCategory(id: string, name: string): Promise<boolean> {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const res = await authFetch(`/admin/categories/${id}`, {
      method: 'PUT',
      json: { name, slug },
    })
    if (!res.ok) return false
    await load()
    return true
  }

  async function deleteCategory(id: string): Promise<boolean> {
    const res = await authFetch(`/admin/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    await load()
    return true
  }

  onMounted(load)

  return { categories, isLoading, error, load, createCategory, updateCategory, deleteCategory }
}
