import { ref, onMounted, type Ref } from 'vue'

export type AsyncDataState<T> = {
  data: Ref<T>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
}

export function useAsyncData<T>(fetcher: () => Promise<T>, initial: T): AsyncDataState<T> {
  const data = ref(initial) as Ref<T>
  const isLoading = ref(true)
  const hasError = ref(false)

  onMounted(async () => {
    try {
      data.value = await fetcher()
    } catch (err) {
      console.error('useAsyncData failed:', err instanceof Error ? err.message : String(err))
      hasError.value = true
    } finally {
      isLoading.value = false
    }
  })

  return { data, isLoading, hasError }
}
