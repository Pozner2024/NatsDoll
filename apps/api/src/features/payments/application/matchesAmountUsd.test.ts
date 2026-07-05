import { describe, it, expect } from 'vitest'
import { matchesAmountUsd } from './matchesAmountUsd'

describe('matchesAmountUsd', () => {
  it('совпадает при каноничной строке с двумя знаками', () => {
    expect(matchesAmountUsd('42.50', 42.5)).toBe(true)
    expect(matchesAmountUsd('29.00', 29)).toBe(true)
  })

  it('терпит нестандартный формат числа от провайдера', () => {
    expect(matchesAmountUsd('25.0', 25)).toBe(true)
    expect(matchesAmountUsd('25', 25)).toBe(true)
    expect(matchesAmountUsd('25.000', 25)).toBe(true)
    expect(matchesAmountUsd(25, 25)).toBe(true)
  })

  it('гасит суб-центовый float-шум', () => {
    expect(matchesAmountUsd('39.99', 13.33 * 3)).toBe(true)
  })

  it('не совпадает при реальном расхождении суммы', () => {
    expect(matchesAmountUsd('0.01', 42.5)).toBe(false)
    expect(matchesAmountUsd('1.00', 42.5)).toBe(false)
    expect(matchesAmountUsd('25.01', 25)).toBe(false)
  })

  it('не совпадает при отсутствующем/нечисловом значении', () => {
    expect(matchesAmountUsd(null, 42.5)).toBe(false)
    expect(matchesAmountUsd(undefined, 42.5)).toBe(false)
    expect(matchesAmountUsd('abc', 42.5)).toBe(false)
    expect(matchesAmountUsd(Number.NaN, 42.5)).toBe(false)
  })
})
