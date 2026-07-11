// Vitest runs in jsdom, which doesn't provide matchMedia by default.
// Some components (e.g. responsive sliders) rely on it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

import { ref, watch, isRef } from 'vue'
import { vi } from 'vitest'

type FakeAsyncDataOptions = {
  default?: () => unknown
  watch?: Parameters<typeof watch>[0][]
  lazy?: boolean
}

vi.mock('nuxt/app', () => {
  function useAsyncData(keyOrHandler: unknown, maybeHandler?: unknown, maybeOptions?: unknown) {
    const hasKey = typeof keyOrHandler === 'string' || isRef(keyOrHandler)
    const key = hasKey ? keyOrHandler : undefined
    const handler = (hasKey ? maybeHandler : keyOrHandler) as () => Promise<unknown>
    const options = ((hasKey ? maybeOptions : maybeHandler) ?? {}) as FakeAsyncDataOptions

    const data = ref(options.default?.() ?? null)
    const status = ref<'idle' | 'pending' | 'success' | 'error'>('pending')
    const error = ref<unknown>(null)

    async function execute(): Promise<void> {
      status.value = 'pending'
      error.value = null
      try {
        data.value = await handler()
        status.value = 'success'
      } catch (e) {
        error.value = e
        status.value = 'error'
      }
    }

    const initial = execute()
    if (isRef(key)) watch(key, () => { void execute() })
    if (options.watch) watch(options.watch, () => { void execute() })

    const result = {
      data,
      status,
      error,
      refresh: execute,
      execute,
      clear: () => {},
    }
    return Object.assign(initial.then(() => result), result)
  }

  return {
    useAsyncData,
    useLazyAsyncData: (a: unknown, b?: unknown, c?: unknown) => useAsyncData(a, b, c),
    createError: (input: { statusCode?: number; statusMessage?: string }) =>
      Object.assign(new Error(input.statusMessage ?? 'Error'), input),
    useSeoMeta: () => {},
    useHead: () => {},
    useRuntimeConfig: () => ({ public: { siteUrl: 'https://natsdoll.com' } }),
  }
})

