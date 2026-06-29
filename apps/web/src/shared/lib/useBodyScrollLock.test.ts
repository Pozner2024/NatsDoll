import { describe, it, expect, afterEach } from 'vitest'
import { lockScroll, unlockScroll } from './useBodyScrollLock'

afterEach(() => {
  // Сбрасываем стиль и страхуемся от рассинхрона счётчика между тестами.
  document.body.style.overflow = ''
})

describe('useBodyScrollLock', () => {
  it('lockScroll прячет overflow, unlockScroll возвращает', () => {
    lockScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockScroll()
    expect(document.body.style.overflow).toBe('')
  })

  it('вложенные блокировки снимаются только последним unlock (счётчик)', () => {
    lockScroll()
    lockScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockScroll()
    expect(document.body.style.overflow).toBe('')
  })

  it('лишний unlockScroll без блокировки не уводит счётчик в минус', () => {
    unlockScroll()
    expect(document.body.style.overflow).toBe('')
    // следующая блокировка по-прежнему работает
    lockScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockScroll()
    expect(document.body.style.overflow).toBe('')
  })
})
