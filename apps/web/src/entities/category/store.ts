import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchCategories } from './categoryApi'
import type { Category } from './types'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref(false)
  let loaded = false

  async function load() {
    if (loaded || loading.value) return
    loading.value = true
    error.value = false
    try {
      categories.value = await fetchCategories()
      loaded = true
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  return { categories, loading, error, load }
})
