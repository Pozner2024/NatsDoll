import { AppError } from '../../../shared/errors'
import type { CartRepository, RemoveFromCart, CartView } from '../types'

export function makeRemoveFromCart(repo: CartRepository): RemoveFromCart {
  return async function removeFromCart(userId: string, itemId: string): Promise<CartView> {
    const item = await repo.findCartItemById(itemId)
    if (!item) throw new AppError(404, 'Cart item not found')

    const cartId = await repo.getOrCreateCartId(userId)
    if (item.cartId !== cartId) throw new AppError(403, 'Forbidden')

    await repo.deleteCartItem(itemId)
    return repo.getCartView(userId)
  }
}
