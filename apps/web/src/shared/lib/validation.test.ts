import { describe, it, expect } from 'vitest'
import { emailSchema, validateEmail } from './validation'

describe('emailSchema', () => {
  it('принимает корректный email', () => {
    expect(emailSchema.safeParse('nat@test.com').success).toBe(true)
  })

  it('обрезает пробелы по краям', () => {
    const result = emailSchema.safeParse('  nat@test.com  ')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('nat@test.com')
  })

  it('отклоняет пустую строку с сообщением "Please enter your email"', () => {
    const result = emailSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Please enter your email')
  })

  it('отклоняет строку из пробелов с сообщением "Please enter your email"', () => {
    const result = emailSchema.safeParse('   ')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Please enter your email')
  })

  it('отклоняет невалидный формат с сообщением "Invalid email format"', () => {
    const result = emailSchema.safeParse('not-an-email')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Invalid email format')
  })

  it('отклоняет email без домена', () => {
    const result = emailSchema.safeParse('nat@')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Invalid email format')
  })
})

describe('validateEmail', () => {
  it('возвращает пустую строку для валидного email', () => {
    expect(validateEmail('nat@test.com')).toBe('')
  })

  it('возвращает "Please enter your email" для пустой строки', () => {
    expect(validateEmail('')).toBe('Please enter your email')
  })

  it('возвращает "Invalid email format" для невалидного email', () => {
    expect(validateEmail('abc')).toBe('Invalid email format')
  })
})
