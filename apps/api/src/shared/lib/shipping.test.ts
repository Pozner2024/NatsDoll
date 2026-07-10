import { describe, it, expect } from 'vitest'
import { calcShipping } from './shipping'

describe('calcShipping', () => {
  it('returns 12 for 1 item', () => {
    expect(calcShipping(1)).toBe(12)
  })

  it('returns 13 for 2 items', () => {
    expect(calcShipping(2)).toBe(13)
  })

  it('returns 21 for 10 items', () => {
    expect(calcShipping(10)).toBe(21)
  })

  it('uses provided rates instead of defaults', () => {
    expect(calcShipping(1, 15, 5)).toBe(15)
    expect(calcShipping(3, 15, 5)).toBe(25)
  })
})
