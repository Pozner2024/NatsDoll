import { setActivePinia, createPinia, storeToRefs } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthModal } from './useAuthModal'

describe('useAuthModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('изначально закрыт', () => {
    const store = useAuthModal()
    const { isOpen } = storeToRefs(store)
    expect(isOpen.value).toBe(false)
  })

  it('open открывает модал', () => {
    const store = useAuthModal()
    const { isOpen } = storeToRefs(store)
    store.open()
    expect(isOpen.value).toBe(true)
  })

  it('close закрывает модал', () => {
    const store = useAuthModal()
    const { isOpen } = storeToRefs(store)
    store.open()
    store.close()
    expect(isOpen.value).toBe(false)
  })

  it('open сбрасывает mode в login', () => {
    const store = useAuthModal()
    const { mode } = storeToRefs(store)
    store.open('register')
    store.open()
    expect(mode.value).toBe('login')
  })

  it('open принимает mode register', () => {
    const store = useAuthModal()
    const { mode } = storeToRefs(store)
    store.open('register')
    expect(mode.value).toBe('register')
  })
})
