import type { CartView } from '../types'
import type { ActiveSale } from '../../admin/types'
import { saleApplies, applyDiscount } from '../../../shared/lib'

export function applySaleToCart(cart: CartView, sale: ActiveSale | null): CartView {
  if (!sale) return cart

  const items = cart.items.map((item) => {
    if (!saleApplies(sale, item.productId, item.productCategoryId)) return item

    const originalUnitPrice = item.unitPrice
    const unitPrice = applyDiscount(originalUnitPrice, sale.discount)
    return { ...item, originalUnitPrice, unitPrice, subtotal: Math.round(unitPrice * item.quantity * 100) / 100 }
  })

  const totalAmount = Math.round(items.reduce((sum, it) => sum + it.subtotal, 0) * 100) / 100
  return { ...cart, items, totalAmount }
}
