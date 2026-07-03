import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('добавляет error-тост с сообщением и возвращает id', () => {
    const toast = useToast()
    const id = toast.error('Something failed')
    expect(toast.items).toHaveLength(1)
    expect(toast.items[0]).toMatchObject({ id, type: 'error', message: 'Something failed' })
  })

  it('различает типы success/info', () => {
    const toast = useToast()
    toast.success('Saved')
    toast.info('Heads up')
    expect(toast.items.map(t => t.type)).toEqual(['success', 'info'])
  })

  it('dismiss удаляет конкретный тост по id', () => {
    const toast = useToast()
    const a = toast.error('A')
    toast.error('B')
    toast.dismiss(a)
    expect(toast.items.map(t => t.message)).toEqual(['B'])
  })

  it('автоматически скрывает тост по истечении ttl', () => {
    const toast = useToast()
    toast.error('temp', 3000)
    expect(toast.items).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(toast.items).toHaveLength(0)
  })

  it('ttl<=0 оставляет тост навсегда (не авто-скрывает)', () => {
    const toast = useToast()
    toast.error('persistent', 0)
    vi.advanceTimersByTime(100000)
    expect(toast.items).toHaveLength(1)
  })
})
