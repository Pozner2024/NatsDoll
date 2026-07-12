// Универсальная логика для управления слайдером.
//  Предоставляет:
//  - Циклическое переключение (вперед/назад/переход к индексу).
//  - Автоматическую смену слайдов через заданный интервал.
//  - Интеллектуальный сброс таймера при ручном взаимодействии.
//  - Автоматическую очистку ресурсов при уничтожени

import { ref, computed, watch, onMounted, onUnmounted, isRef } from 'vue'
import type { Ref } from 'vue'
import { prefersReducedMotion } from './reducedMotion'

const MIN_INTERVAL_MS = 100

/**
 * Composable (Composable — это обычная функция, которая содержит в себе 
 * "реактивную" логику (состояние) и которую можно переиспользовать в разных 
 * компонентах.) для логики слайдера с автоплеем и ручной навигацией.
 * Должен вызываться только внутри `setup()` компонента.
 *
 * @param count - количество слайдов (число или реактивный ref)
 * @param intervalMs - интервал автоплея в миллисекундах (минимум 100)
 */
export function useSlider(count: Ref<number> | number, intervalMs: number) {
  const currentIndex = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null
  const pauseReasons = new Set<string>()

  const total = computed(() => isRef(count) ? count.value : count)

  function startTimer() {
    if (intervalMs < MIN_INTERVAL_MS) return
    if (pauseReasons.size > 0 || prefersReducedMotion()) return
    timer = setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % total.value
    }, intervalMs)
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function resetTimer() {
    stopTimer()
    startTimer()
  }

  function pause(reason = 'default') {
    pauseReasons.add(reason)
    stopTimer()
  }

  function resume(reason = 'default') {
    pauseReasons.delete(reason)
    if (pauseReasons.size === 0) resetTimer()
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

  watch(total, (newTotal) => {
    if (currentIndex.value >= newTotal) {
      currentIndex.value = Math.max(0, newTotal - 1)
    }
  })

  onMounted(startTimer)
  onUnmounted(stopTimer)

  return { currentIndex, next, prev, goTo, pause, resume }
}
