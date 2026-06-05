import { AppError } from '../../../shared/errors'
import { calcShipping } from '../../../shared/lib'
import type { OrderRepository, CreateOrder, ShippingAddress } from '../types'
import type { GetActiveSale } from '../../admin/types'

function applyDiscount(price: number, discount: number): number {
  return Math.round(price * (1 - discount / 100) * 100) / 100
}

export function makeCreateOrder(repo: OrderRepository, getActiveSale: GetActiveSale): CreateOrder {
  return async function createOrder(userId: string, shippingAddress: ShippingAddress) {
    const [items, sale] = await Promise.all([
      repo.getCartItemsForCheckout(userId),
      getActiveSale(),
    ])

    if (items.length === 0) {
      throw new AppError(400, 'Cart is empty')
    }

    for (const item of items) {
      if (!item.productIsAvailable) {
        throw new AppError(409, `"${item.productName}" is no longer available`)
      }
      if (item.productStock < item.quantity) {
        throw new AppError(409, `Not enough stock for "${item.productName}"`)
      }
    }

    const itemsWithSale = sale
      ? items.map((item) => {
          const applies =
            sale.scope === 'ALL' ||
            (sale.scope === 'CATEGORIES' && sale.categoryIds.includes(item.categoryId)) ||
            (sale.scope === 'PRODUCTS' && sale.productIds.includes(item.productId))
          return applies
            ? { ...item, salePrice: applyDiscount(item.productPrice, sale.discount) }
            : item
        })
      : items

    const totalItemCount = itemsWithSale.reduce((sum, item) => sum + item.quantity, 0)
    const shippingCost = calcShipping(totalItemCount)

    return repo.createOrderFromCart(userId, itemsWithSale, shippingCost, shippingAddress)
  }
}
