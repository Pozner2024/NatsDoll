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
    const [{ currentIndex }, app] = withSetup(() => useSlider(4, 3000))
    expect(currentIndex.value).toBe(0)
    app.unmount()
  })

  it('next переходит на следующий слайд', () => {
    const [{ currentIndex, next }, app] = withSetup(() => useSlider(4, 3000))
    next()
    expect(currentIndex.value).toBe(1)
    app.unmount()
  })

  it('next оборачивается с последнего на первый', () => {
    const [{ currentIndex, next }, app] = withSetup(() => useSlider(4, 3000))
    next(); next(); next(); next()
    expect(currentIndex.value).toBe(0)
    app.unmount()
  })

  it('prev с первого переходит на последний', () => {
    const [{ currentIndex, prev }, app] = withSetup(() => useSlider(4, 3000))
    prev()
    expect(currentIndex.value).toBe(3)
    app.unmount()
  })

  it('goTo устанавливает нужный индекс', () => {
    const [{ currentIndex, goTo }, app] = withSetup(() => useSlider(4, 3000))
    goTo(2)
    expect(currentIndex.value).toBe(2)
    app.unmount()
  })

  it('goTo игнорирует невалидный индекс', () => {
    const [{ currentIndex, goTo }, app] = withSetup(() => useSlider(4, 3000))
    goTo(-1)
    expect(currentIndex.value).toBe(0)
    goTo(4)
    expect(currentIndex.value).toBe(0)
    app.unmount()
  })

  it('автоплей инкрементирует currentIndex через intervalMs', async () => {
    const [{ currentIndex }, app] = withSetup(() => useSlider(4, 3000))
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(currentIndex.value).toBe(1)
    app.unmount()
  })
})
