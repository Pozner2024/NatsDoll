import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContactModal } from './useContactModal'
import * as api from './contactApi'

vi.mock('./contactApi')

const payload = { name: 'A', email: 'a@b.co', message: 'hi' }

describe('useContactModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('open сбрасывает статус и открывает', () => {
    const store = useContactModal()
    store.open()
    expect(store.isOpen).toBe(true)
    expect(store.submitStatus).toBe('idle')
    expect(store.errorMessage).toBe('')
  })

  it('успешный submit → success и автозакрытие по таймеру', async () => {
    vi.mocked(api.sendContactMessage).mockResolvedValue(undefined)
    const store = useContactModal()
    store.open()
    await store.submit(payload)
    expect(api.sendContactMessage).toHaveBeenCalledWith(payload)
    expect(store.submitStatus).toBe('success')
    expect(store.isOpen).toBe(true)

    vi.advanceTimersByTime(2000)
    expect(store.isOpen).toBe(false)
    expect(store.submitStatus).toBe('idle')
  })

  it('ошибка submit → error с сообщением, окно остаётся открытым', async () => {
    vi.mocked(api.sendContactMessage).mockRejectedValue(new Error('boom'))
    const store = useContactModal()
    store.open()
    await store.submit(payload)
    expect(store.submitStatus).toBe('error')
    expect(store.errorMessage).toBe('boom')
    expect(store.isOpen).toBe(true)
  })

  it('close отменяет отложенное автозакрытие', async () => {
    vi.mocked(api.sendContactMessage).mockResolvedValue(undefined)
    const store = useContactModal()
    store.open()
    await store.submit(payload)
    store.close()
    expect(store.isOpen).toBe(false)
    // повторное открытие не должно схлопнуться зависшим таймером
    store.open()
    vi.advanceTimersByTime(2000)
    expect(store.isOpen).toBe(true)
  })
})
