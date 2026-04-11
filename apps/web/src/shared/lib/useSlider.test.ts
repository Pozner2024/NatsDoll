import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, defineComponent, createApp } from 'vue'
import { useSlider } from './useSlider'

function withSetup<T>(composable: () => T): [T, ReturnType<typeof createApp>] {
  let result: T
  const app = createApp(defineComponent({
    setup() {
      result = composable()
      return () => {}
    },
    template: '<div/>',
  }))
  app.mount(document.createElement('div'))
  return [result!, app]
}

describe('useSlider', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('currentIndex начинается с 0', () => {
    const { currentIndex } = useSlider(4, 3000)
    expect(currentIndex.value).toBe(0)
  })

  it('next переходит на следующий слайд', () => {
    const { currentIndex, next } = useSlider(4, 3000)
    next()
    expect(currentIndex.value).toBe(1)
  })

  it('next оборачивается с последнего на первый', () => {
    const { currentIndex, next } = useSlider(4, 3000)
    next(); next(); next(); next()
    expect(currentIndex.value).toBe(0)
  })

  it('prev с первого переходит на последний', () => {
    const { currentIndex, prev } = useSlider(4, 3000)
    prev()
    expect(currentIndex.value).toBe(3)
  })

  it('goTo устанавливает нужный индекс', () => {
    const { currentIndex, goTo } = useSlider(4, 3000)
    goTo(2)
    expect(currentIndex.value).toBe(2)
  })

  it('goTo игнорирует невалидный индекс', () => {
    const { currentIndex, goTo } = useSlider(4, 3000)
    goTo(-1)
    expect(currentIndex.value).toBe(0)
    goTo(4)
    expect(currentIndex.value).toBe(0)
  })

  it('автоплей инкрементирует currentIndex через intervalMs', async () => {
    const [{ currentIndex }, app] = withSetup(() => useSlider(4, 3000))
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(currentIndex.value).toBe(1)
    app.unmount()
  })

  it('pause останавливает автоплей', async () => {
    const [{ currentIndex, pause }, app] = withSetup(() => useSlider(4, 3000))
    pause()
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(currentIndex.value).toBe(0)
    app.unmount()
  })

  it('resume после pause возобновляет автоплей', async () => {
    const [{ currentIndex, pause, resume }, app] = withSetup(() => useSlider(4, 3000))
    pause()
    resume()
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(currentIndex.value).toBe(1)
    app.unmount()
  })
})
