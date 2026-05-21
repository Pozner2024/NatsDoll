import { AppError } from '../../../shared/errors'
import type { OrderRepository, CreateOrder, ShippingAddress } from '../types'

export function makeCreateOrder(repo: OrderRepository): CreateOrder {
  return async function createOrder(userId: string, shippingAddress: ShippingAddress) {
    const items = await repo.getCartItemsForCheckout(userId)

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

    const totalAmount = items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0)

    return repo.createOrderFromCart(userId, items, totalAmount, shippingAddress)
  }
}
