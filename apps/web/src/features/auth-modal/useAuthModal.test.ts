import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthModal } from './useAuthModal'

describe('useAuthModal', () => {
  beforeEach(() => {
    const { close } = useAuthModal()
    close()
  })

  it('изначально закрыт', () => {
    const { isOpen } = useAuthModal()
    expect(isOpen.value).toBe(false)
  })

  it('open открывает модал', () => {
    const { isOpen, open } = useAuthModal()
    open()
    expect(isOpen.value).toBe(true)
  })

  it('close закрывает модал', () => {
    const { isOpen, open, close } = useAuthModal()
    open()
    close()
    expect(isOpen.value).toBe(false)
  })

  it('open сбрасывает mode в login', () => {
    const { mode, open } = useAuthModal()
    open('register')
    open()
    expect(mode.value).toBe('login')
  })

  it('open принимает mode register', () => {
    const { mode, open } = useAuthModal()
    open('register')
    expect(mode.value).toBe('register')
  })
})
