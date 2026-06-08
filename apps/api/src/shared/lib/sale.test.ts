import { describe, it, expect } from 'vitest'
import { saleApplies, applyDiscount, type SaleRule } from './sale'

describe('saleApplies', () => {
  const base: Omit<SaleRule, 'scope'> = { categoryIds: ['c1'], productIds: ['p1'], discount: 10 }

  it('scope ALL применяется к любому товару', () => {
    expect(saleApplies({ ...base, scope: 'ALL' }, 'pX', 'cX')).toBe(true)
  })

  it('scope CATEGORIES — только если категория в списке', () => {
    const sale: SaleRule = { ...base, scope: 'CATEGORIES' }
    expect(saleApplies(sale, 'pX', 'c1')).toBe(true)
    expect(saleApplies(sale, 'pX', 'cZ')).toBe(false)
  })

  it('scope PRODUCTS — только если товар в списке', () => {
    const sale: SaleRule = { ...base, scope: 'PRODUCTS' }
    expect(saleApplies(sale, 'p1', 'cZ')).toBe(true)
    expect(saleApplies(sale, 'pZ', 'cZ')).toBe(false)
  })
})

describe('applyDiscount', () => {
  it('скидка 33% округляется до копеек', () => {
    expect(applyDiscount(10, 33)).toBe(6.7)
  })

  it('округление .5 (банковское/математическое) даёт корректную цену', () => {
    expect(applyDiscount(9.99, 50)).toBe(5)
  })

  it('скидка 0% не меняет цену', () => {
    expect(applyDiscount(19.99, 0)).toBe(19.99)
  })

  it('скидка 100% даёт 0', () => {
    expect(applyDiscount(42, 100)).toBe(0)
  })

  it('результат не имеет более двух знаков после запятой', () => {
    const result = applyDiscount(100, 33)
    expect(Number.isInteger(result * 100)).toBe(true)
  })
})
