import { computed } from 'vue'
import { useAsyncData } from 'nuxt/app'
import { fetchCollections, type Collection } from './collectionsApi'

export function useCollectionSection() {
  const { data, status } = useAsyncData<Collection[]>(
    'collections',
    () => fetchCollections(),
    { default: () => [] },
  )
  const isLoading = computed(() => status.value === 'pending')
  const hasError = computed(() => status.value === 'error')
  return { collections: data, isLoading, hasError }
}
