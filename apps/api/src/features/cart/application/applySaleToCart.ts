import type { CartView } from '../types'
import type { ActiveSale } from '../../admin/types'

export function applySaleToCart(cart: CartView, sale: ActiveSale | null): CartView {
  if (!sale) return cart

  const items = cart.items.map((item) => {
    const applies =
      sale.scope === 'ALL' ||
      (sale.scope === 'CATEGORIES' && sale.categoryIds.includes(item.productCategoryId)) ||
      (sale.scope === 'PRODUCTS' && sale.productIds.includes(item.productId))
    if (!applies) return item

    const unitPrice = Math.round(item.unitPrice * (1 - sale.discount / 100) * 100) / 100
    return { ...item, unitPrice, subtotal: Math.round(unitPrice * item.quantity * 100) / 100 }
  })

  const totalAmount = Math.round(items.reduce((sum, it) => sum + it.subtotal, 0) * 100) / 100
  return { ...cart, items, totalAmount }
}
