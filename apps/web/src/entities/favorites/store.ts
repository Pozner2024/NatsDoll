import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import type { Product } from '@/entities/product'
import {
  fetchFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
} from './favoritesApi'

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const togglingIds = ref<Set<string>>(new Set())
  let loaded = false

  const ids = computed(() => new Set(items.value.map((p) => p.id)))
  const count = computed(() => items.value.length)

  function isFavorite(productId: string): boolean {
    return ids.value.has(productId)
  }

  function isToggling(productId: string): boolean {
    return togglingIds.value.has(productId)
  }

  async function load(force = false): Promise<void> {
    if (loaded && !force) return
    loading.value = true
    error.value = null
    try {
      items.value = await fetchFavorites()
      loaded = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load favorites'
    } finally {
      loading.value = false
    }
  }

  async function toggle(product: Product): Promise<void> {
    if (togglingIds.value.has(product.id)) return

    const wasFavorite = isFavorite(product.id)
    const previous = items.value
    items.value = wasFavorite
      ? items.value.filter((p) => p.id !== product.id)
      : [product, ...items.value]
    togglingIds.value = new Set(togglingIds.value).add(product.id)
    error.value = null

    try {
      if (wasFavorite) {
        await apiRemoveFavorite(product.id)
      } else {
        await apiAddFavorite(product.id)
      }
      loaded = true
    } catch (e) {
      items.value = previous
      error.value = e instanceof Error ? e.message : 'Failed to update favorites'
      throw e
    } finally {
      const next = new Set(togglingIds.value)
      next.delete(product.id)
      togglingIds.value = next
    }
  }

  function reset(): void {
    items.value = []
    loaded = false
    error.value = null
    togglingIds.value = new Set()
  }

  return {
    items: readonly(items),
    ids,
    count,
    loading: readonly(loading),
    error: readonly(error),
    isFavorite,
    isToggling,
    load,
    toggle,
    reset,
  }
})
