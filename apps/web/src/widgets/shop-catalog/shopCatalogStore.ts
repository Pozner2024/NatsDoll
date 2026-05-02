import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchCategories, type Category } from '@/entities/category'

export const useShopCatalogStore = defineStore('shopCatalog', () => {
  const categories = ref<Category[]>([])
  const categoriesLoading = ref(false)
  const categoriesError = ref(false)
  let loaded = false

  async function loadCategories() {
    if (loaded || categoriesLoading.value) return
    categoriesLoading.value = true
    categoriesError.value = false
    try {
      categories.value = await fetchCategories()
      loaded = true
    } catch {
      categoriesError.value = true
    } finally {
      categoriesLoading.value = false
    }
  }

  return { categories, categoriesLoading, categoriesError, loadCategories }
})
