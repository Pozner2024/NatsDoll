import { describe, it, expect } from 'vitest'
import { calcShipping } from './shipping'

describe('calcShipping', () => {
  it('returns 0 for 1 item', () => {
    expect(calcShipping(1)).toBe(0)
  })

  it('returns 0 for 2 items', () => {
    expect(calcShipping(2)).toBe(0)
  })

  it('returns 0 for 10 items', () => {
    expect(calcShipping(10)).toBe(0)
  })
})
