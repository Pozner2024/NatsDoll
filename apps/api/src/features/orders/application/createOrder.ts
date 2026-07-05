import { AppError } from '../../../shared/errors'
import { calcShipping } from '../../../shared/lib'
import type { OrderRepository, CreateOrder, ShippingAddress } from '../types'
import type { GetActiveSale } from '../../admin/types'
import type { AuthRepository } from '../../auth/infrastructure/authRepository'
import type { EmailService } from '../../auth/infrastructure/emailService'

export function makeCreateOrder(
  repo: OrderRepository,
  getActiveSale: GetActiveSale,
  authRepo: Pick<AuthRepository, 'findById'>,
  emailService: EmailService,
): CreateOrder {
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

    const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const shippingCost = calcShipping(totalItemCount)
    const sale = await getActiveSale()

    const order = await repo.createOrderFromCart(userId, items, shippingCost, shippingAddress, sale)

    const user = await authRepo.findById(userId)
    if (user) {
      try {
        await emailService.sendOrderConfirmation(user.email, user.name, order.orderNumber, order.items, order.totalAmount)
      } catch (err) {
        console.error('Failed to send order confirmation:', err)
      }
    }
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && user) {
      try {
        await emailService.sendNewOrderAlert(adminEmail, order.orderNumber, user.email, order.totalAmount)
      } catch (err) {
        console.error('Failed to send new order alert:', err)
      }
    }

    return order
  }
}
