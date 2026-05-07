import { ref, onMounted, type Ref } from 'vue'

export type AsyncDataState<T> = {
  data: Ref<T>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
}

/**
 * Универсальный Composable для загрузки асинхронных данных (например, с сервера).
 * Автоматически управляет состояниями загрузки (isLoading) и ошибки (hasError).
 * Данные запрашиваются автоматически при появлении компонента на экране (onMounted).
 *
 * @param fetcher - Асинхронная функция, которая идет в сеть за данными.
 * @param initial - Стартовое значение-заглушка (пока данные еще скачиваются).
 * @returns Объект с реактивными переменными: { data, isLoading, hasError }
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, initial: T): AsyncDataState<T> {
  const data = ref(initial) as Ref<T>
  const isLoading = ref(true)
  const hasError = ref(false)
  let requestId = 0

  onMounted(async () => {
    requestId++
    const currentRequestId = requestId

    try {
      const result = await fetcher()
      if (currentRequestId === requestId) {
        data.value = result
      }
    } catch (err) {
      if (currentRequestId === requestId) {
        console.error('useAsyncData failed:', err instanceof Error ? err.message : String(err))
        hasError.value = true
      }
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false
      }
    }
  })

  return { data, isLoading, hasError }
}
