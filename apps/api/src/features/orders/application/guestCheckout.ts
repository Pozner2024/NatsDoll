import { AppError } from '../../../shared/errors'
import { calcShipping } from '../../../shared/lib'
import type { OrderRepository, GuestCheckoutInput, GuestOrderItem, OrderDetail, GetProductsForCheckout } from '../types'
import type { GetActiveSale } from '../../admin/types'
import type { GetShippingSettings } from '../../shipping'
import type { AuthRepository } from '../../auth/infrastructure/authRepository'
import type { EmailService } from '../../auth/infrastructure/emailService'
import type { issueTokensForUser, AuthTokensResult } from '../../auth/application/issueTokens'

export type GuestCheckout = (input: GuestCheckoutInput) => Promise<{ order: OrderDetail; tokens: AuthTokensResult }>

export function makeGuestCheckout(
  orderRepo: Pick<OrderRepository, 'createOrderFromItems'>,
  getActiveSale: GetActiveSale,
  getProductsForCheckout: GetProductsForCheckout,
  authRepo: Pick<AuthRepository, 'findByEmail' | 'createGuestUser' | 'saveRefreshToken' | 'pruneUserSessions'>,
  issueTokens: typeof issueTokensForUser,
  emailService: EmailService,
  getShippingRates: GetShippingSettings,
): GuestCheckout {
  return async (input) => {
    if (input.items.length === 0) {
      throw new AppError(400, 'Cart is empty')
    }

    const products = await getProductsForCheckout(input.items.map((i) => i.productId))
    const byId = new Map(products.map((p) => [p.id, p]))

    const orderItems: GuestOrderItem[] = input.items.map((item) => {
      const product = byId.get(item.productId)
      if (!product || !product.isPublished || product.deletedAt !== null) {
        throw new AppError(409, 'One of the items is no longer available')
      }
      if (product.stock < item.quantity) {
        throw new AppError(409, `Not enough stock for "${product.name}"`)
      }
      return {
        productId: product.id,
        quantity: item.quantity,
        message: item.message,
        categoryId: product.categoryId,
        productName: product.name,
      }
    })

    const existing = await authRepo.findByEmail(input.email)
    if (existing) {
      // На неаутентифицированном пути НИКОГДА не выдаём сессию в существующий аккаунт и не
      // оформляем под ним заказ — иначе любой, кто введёт чужой email, получил бы доступ к
      // данным владельца (account takeover). Гостю без способа войти фронт предложит прислать
      // ссылку для входа через штатный (rate-limited) /auth-эндпоинт сброса пароля.
      throw new AppError(409, 'An account with this email exists. Please sign in.')
    }
    const user = await authRepo.createGuestUser({ name: input.shippingAddress.fullName, email: input.email })

    const totalItemCount = orderItems.reduce((sum, i) => sum + i.quantity, 0)
    const rates = await getShippingRates()
    const shippingCost = calcShipping(totalItemCount, rates.baseCost, rates.perExtraItemCost)
    const sale = await getActiveSale()

    const order = await orderRepo.createOrderFromItems(user.id, orderItems, shippingCost, input.shippingAddress, sale)
    const tokens = await issueTokens(authRepo as never, user as never)

    try {
      await emailService.sendOrderConfirmation(input.email, input.shippingAddress.fullName, order.orderNumber, order.items, order.totalAmount)
    } catch (err) {
      console.error('Failed to send order confirmation:', err)
    }
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      try {
        await emailService.sendNewOrderAlert(adminEmail, order.orderNumber, input.email, order.totalAmount)
      } catch (err) {
        console.error('Failed to send new order alert:', err)
      }
    }

    return { order, tokens }
  }
}
