import { describe, it, expect, vi } from 'vitest'
import { ref, defineComponent, createApp } from 'vue'
import type { Ref } from 'vue'
import { useClickOutside } from './useClickOutside'

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

describe('useClickOutside', () => {
  it('вызывает handler при клике вне target, когда активен', () => {
    const inside = document.createElement('div')
    const outside = document.createElement('div')
    document.body.append(inside, outside)
    const target = ref(inside) as Ref<HTMLElement | null>
    const isActive = ref(true)
    const handler = vi.fn()

    const [, app] = withSetup(() => useClickOutside(target, isActive, handler))
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)

    app.unmount()
    inside.remove(); outside.remove()
  })

  it('не вызывает handler при клике внутри target', () => {
    const inside = document.createElement('div')
    document.body.append(inside)
    const target = ref(inside) as Ref<HTMLElement | null>
    const isActive = ref(true)
    const handler = vi.fn()

    const [, app] = withSetup(() => useClickOutside(target, isActive, handler))
    inside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()

    app.unmount()
    inside.remove()
  })

  it('не реагирует, пока isActive=false, и начинает после включения', async () => {
    const outside = document.createElement('div')
    document.body.append(outside)
    const target = ref(document.createElement('div')) as Ref<HTMLElement | null>
    const isActive = ref(false)
    const handler = vi.fn()

    const [, app] = withSetup(() => useClickOutside(target, isActive, handler))
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()

    isActive.value = true
    await Promise.resolve()
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)

    app.unmount()
    outside.remove()
  })

  it('после unmount слушатель снят — handler больше не зовётся', () => {
    const outside = document.createElement('div')
    document.body.append(outside)
    const target = ref(document.createElement('div')) as Ref<HTMLElement | null>
    const isActive = ref(true)
    const handler = vi.fn()

    const [, app] = withSetup(() => useClickOutside(target, isActive, handler))
    app.unmount()
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()

    outside.remove()
  })
})
