import { describe, it, expect } from 'vitest'
import { formatPrice } from './formatPrice'

describe('formatPrice', () => {
  it('formats integer prices with two decimals and dollar sign', () => {
    expect(formatPrice(24)).toBe('$24.00')
  })

  it('formats one-decimal prices with two decimals', () => {
    expect(formatPrice(24.5)).toBe('$24.50')
  })

  it('formats zero as $0.00', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })

  it('formats large numbers with comma thousand separators', () => {
    expect(formatPrice(1234.56)).toBe('$1,234.56')
  })
})
