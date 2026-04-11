import { ref, onMounted, onUnmounted, isRef } from 'vue'
import type { Ref } from 'vue'

const MIN_INTERVAL_MS = 100

/**
 * Composable для логики слайдера с автоплеем и ручной навигацией.
 * Должен вызываться только внутри `setup()` компонента.
 *
 * @param count - количество слайдов (число или реактивный ref)
 * @param intervalMs - интервал автоплея в миллисекундах (минимум 100)
 */
export function useSlider(count: Ref<number> | number, intervalMs: number) {
  const currentIndex = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function getCount() {
    return isRef(count) ? count.value : count
  }

  function startTimer() {
    if (intervalMs < MIN_INTERVAL_MS) return
    timer = setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % getCount()
    }, intervalMs)
  }

  function resetTimer() {
    if (timer) clearInterval(timer)
    startTimer()
  }

  function next() {
    currentIndex.value = (currentIndex.value + 1) % getCount()
    resetTimer()
  }

  function prev() {
    currentIndex.value = (currentIndex.value - 1 + getCount()) % getCount()
    resetTimer()
  }

  function goTo(index: number) {
    const total = getCount()
    if (index < 0 || index >= total) return
    currentIndex.value = index
    resetTimer()
  }

  function pause() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function resume() {
    if (!timer) startTimer()
  }

  onMounted(startTimer)
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { currentIndex, next, prev, goTo, pause, resume }
}
