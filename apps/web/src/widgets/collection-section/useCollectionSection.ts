import { ref, onMounted } from 'vue'
import { fetchCollections, type Collection } from './collectionsApi'

export function useCollectionSection() {
  const collections = ref<Collection[]>([])
  const isLoading = ref(true)
  const hasError = ref(false)

  onMounted(async () => {
    isLoading.value = true
    try {
      collections.value = await fetchCollections()
    } catch (err) {
      console.error('Failed to load collections', err instanceof Error ? err.message : String(err))
      hasError.value = true
    } finally {
      isLoading.value = false
    }
  })

  return { collections, isLoading, hasError }
}
