import { AppError } from '../../../shared/errors'
import { calcShipping } from '../../../shared/lib'
import type { OrderRepository, GuestCheckoutInput, GuestOrderItem, OrderDetail } from '../types'
import type { GetActiveSale } from '../../admin/types'
import type { AuthRepository } from '../../auth/infrastructure/authRepository'
import type { issueTokensForUser, AuthTokensResult } from '../../auth/application/issueTokens'

export type CheckoutProduct = {
  id: string; name: string; price: number; stock: number
  isPublished: boolean; deletedAt: Date | null; categoryId: string
}
export type GetProductsForCheckout = (productIds: string[]) => Promise<CheckoutProduct[]>
export type GuestCheckout = (input: GuestCheckoutInput) => Promise<{ order: OrderDetail; tokens: AuthTokensResult }>

export function makeGuestCheckout(
  orderRepo: Pick<OrderRepository, 'createOrderFromItems'>,
  getActiveSale: GetActiveSale,
  getProductsForCheckout: GetProductsForCheckout,
  authRepo: Pick<AuthRepository, 'findByEmail' | 'createGuestUser' | 'saveRefreshToken' | 'pruneUserSessions'>,
  issueTokens: typeof issueTokensForUser,
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
    if (existing && (existing.passwordHash || existing.googleId)) {
      throw new AppError(409, 'An account with this email exists. Please sign in.')
    }
    const user = existing
      ? { id: existing.id, name: existing.name, email: existing.email, role: existing.role }
      : await authRepo.createGuestUser({ name: input.shippingAddress.fullName, email: input.email })

    const totalItemCount = orderItems.reduce((sum, i) => sum + i.quantity, 0)
    const shippingCost = calcShipping(totalItemCount)
    const sale = await getActiveSale()

    const order = await orderRepo.createOrderFromItems(user.id, orderItems, shippingCost, input.shippingAddress, sale)
    const tokens = await issueTokens(authRepo as never, user as never)
    return { order, tokens }
  }
}
