import { ref, computed, watch, onMounted, onUnmounted, isRef } from 'vue'
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

  const total = computed(() => isRef(count) ? count.value : count)

  function startTimer() {
    if (intervalMs < MIN_INTERVAL_MS) return
    timer = setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % total.value
    }, intervalMs)
  }

  function resetTimer() {
    if (timer) clearInterval(timer)
    startTimer()
  }

  function next() {
    currentIndex.value = (currentIndex.value + 1) % total.value
    resetTimer()
  }

  function prev() {
    currentIndex.value = (currentIndex.value - 1 + total.value) % total.value
    resetTimer()
  }

  function goTo(index: number) {
    if (index < 0 || index >= total.value) return
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

  watch(total, (newTotal) => {
    if (currentIndex.value >= newTotal) {
      currentIndex.value = Math.max(0, newTotal - 1)
    }
  })

  onMounted(startTimer)
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { currentIndex, next, prev, goTo, pause, resume }
}
