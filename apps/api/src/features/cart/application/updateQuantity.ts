import { AppError } from '../../../shared/errors'
import type { CartRepository, UpdateQuantity, UpdateQuantityParams, CartView } from '../types'

export function makeUpdateQuantity(repo: CartRepository): UpdateQuantity {
  return async function updateQuantity(params: UpdateQuantityParams): Promise<CartView> {
    const { userId, itemId, quantity } = params

    if (quantity < 1) throw new AppError(400, 'Quantity must be at least 1')

    const item = await repo.findCartItemById(itemId)
    if (!item) throw new AppError(404, 'Cart item not found')

    const cartId = await repo.getOrCreateCartId(userId)
    if (item.cartId !== cartId) throw new AppError(403, 'Forbidden')

    const product = await repo.findProductForCart(item.productId)
    if (product && quantity > product.stock) {
      throw new AppError(409, 'Not enough stock')
    }

    await repo.updateCartItemQuantity(itemId, quantity)
    return repo.getCartView(userId)
  }
}
