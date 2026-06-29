import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartPrompt } from './useCartPrompt'

describe('useCartPrompt', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('по умолчанию закрыт', () => {
    const store = useCartPrompt()
    expect(store.isOpen).toBe(false)
  })

  it('open открывает, close закрывает', () => {
    const store = useCartPrompt()
    store.open()
    expect(store.isOpen).toBe(true)
    store.close()
    expect(store.isOpen).toBe(false)
  })
})
