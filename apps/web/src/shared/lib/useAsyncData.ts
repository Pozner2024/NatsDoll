import { ref, onMounted, onScopeDispose, type Ref } from 'vue'

export type AsyncDataState<T> = {
  data: Ref<T>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
}

/**
 * Универсальный Composable для загрузки асинхронных данных (например, с сервера).
 * Автоматически управляет состояниями загрузки (isLoading) и ошибки (hasError).
 * Данные запрашиваются один раз при монтировании компонента (onMounted) и
 * отменяются через AbortSignal при его размонтировании.
 *
 * @param fetcher - Асинхронная функция, которая идет в сеть за данными. Получает AbortSignal.
 * @param initial - Стартовое значение-заглушка (пока данные еще скачиваются).
 * @returns Объект с реактивными переменными: { data, isLoading, hasError }
 */
export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  initial: T,
): AsyncDataState<T> {
  const data = ref(initial) as Ref<T>
  const isLoading = ref(true)
  const hasError = ref(false)
  const controller = new AbortController()

  onMounted(async () => {
    try {
      data.value = await fetcher(controller.signal)
    } catch (err) {
      if (controller.signal.aborted) return
      console.error('useAsyncData failed:', err instanceof Error ? err.message : String(err))
      hasError.value = true
    } finally {
      if (!controller.signal.aborted) isLoading.value = false
    }
  })

  onScopeDispose(() => controller.abort())

  return { data, isLoading, hasError }
}
