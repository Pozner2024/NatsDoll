import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export type ToastType = 'error' | 'success' | 'info'
export type Toast = { id: number; type: ToastType; message: string }

const DEFAULT_TTL_MS = 5000

export const useToast = defineStore('toast', () => {
  const items = ref<Toast[]>([])
  let nextId = 0

  function dismiss(id: number): void {
    items.value = items.value.filter((t) => t.id !== id)
  }

  function show(type: ToastType, message: string, ttlMs = DEFAULT_TTL_MS): number {
    const id = ++nextId
    items.value = [...items.value, { id, type, message }]
    if (ttlMs > 0) {
      setTimeout(() => dismiss(id), ttlMs)
    }
    return id
  }

  const error = (message: string, ttlMs?: number) => show('error', message, ttlMs)
  const success = (message: string, ttlMs?: number) => show('success', message, ttlMs)
  const info = (message: string, ttlMs?: number) => show('info', message, ttlMs)

  return { items: readonly(items), show, error, success, info, dismiss }
})
