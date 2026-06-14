import { describe, it, expect } from 'vitest'
import { applySaleToCart } from './applySaleToCart'
import type { CartView } from '../types'
import type { ActiveSale } from '../../admin/types'

function makeCart(): CartView {
  return {
    items: [
      {
        id: 'i1',
        productId: 'p1',
        productCategoryId: 'c1',
        productSlug: 'a',
        productName: 'A',
        productImage: null,
        unitPrice: 100,
        quantity: 2,
        subtotal: 200,
        message: null,
      },
      {
        id: 'i2',
        productId: 'p2',
        productCategoryId: 'c2',
        productSlug: 'b',
        productName: 'B',
        productImage: null,
        unitPrice: 50,
        quantity: 1,
        subtotal: 50,
        message: null,
      },
    ],
    totalAmount: 250,
    itemCount: 3,
  }
}

describe('applySaleToCart', () => {
  it('возвращает исходную корзину без изменений, когда скидки нет', () => {
    const cart = makeCart()
    expect(applySaleToCart(cart, null)).toBe(cart)
  })

  it('применяет ALL-скидку ко всем позициям и пересчитывает суммы', () => {
    const sale: ActiveSale = { discount: 10, scope: 'ALL', categoryIds: [], productIds: [] }
    const result = applySaleToCart(makeCart(), sale)

    expect(result.items[0].unitPrice).toBe(90)
    expect(result.items[0].originalUnitPrice).toBe(100)
    expect(result.items[0].subtotal).toBe(180)
    expect(result.items[1].unitPrice).toBe(45)
    expect(result.items[1].subtotal).toBe(45)
    expect(result.totalAmount).toBe(225)
  })

  it('применяет CATEGORIES-скидку только к подходящим позициям', () => {
    const sale: ActiveSale = { discount: 20, scope: 'CATEGORIES', categoryIds: ['c1'], productIds: [] }
    const result = applySaleToCart(makeCart(), sale)

    expect(result.items[0].unitPrice).toBe(80)
    expect(result.items[0].originalUnitPrice).toBe(100)
    expect(result.items[1].unitPrice).toBe(50)
    expect(result.items[1]).not.toHaveProperty('originalUnitPrice')
    expect(result.totalAmount).toBe(210)
  })

  it('применяет PRODUCTS-скидку только к указанным товарам', () => {
    const sale: ActiveSale = { discount: 50, scope: 'PRODUCTS', categoryIds: [], productIds: ['p2'] }
    const result = applySaleToCart(makeCart(), sale)

    expect(result.items[0].unitPrice).toBe(100)
    expect(result.items[1].unitPrice).toBe(25)
    expect(result.items[1].subtotal).toBe(25)
    expect(result.totalAmount).toBe(225)
  })
})
