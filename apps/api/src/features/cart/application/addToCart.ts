import { AppError } from '../../../shared/errors'
import type { CartRepository, AddToCart, AddToCartParams, CartView } from '../types'

const MAX_MESSAGE_LENGTH = 100

export function makeAddToCart(repo: CartRepository): AddToCart {
  return async function addToCart(params: AddToCartParams): Promise<CartView> {
    const { userId, productId, quantity, message } = params

    if (quantity < 1) {
      throw new AppError(400, 'Quantity must be at least 1')
    }

    const product = await repo.findProductForCart(productId)
    if (!product) throw new AppError(404, 'Product not found')
    if (!product.isAvailable) throw new AppError(410, 'Product is no longer available')

    if (product.messageOptions.length > 0) {
      if (message === null) throw new AppError(400, 'Message is required for this product')
      if (message.length === 0) throw new AppError(400, 'Message cannot be empty')
      if (message.length > MAX_MESSAGE_LENGTH) {
        throw new AppError(400, `Message must be at most ${MAX_MESSAGE_LENGTH} characters`)
      }
    } else if (message !== null) {
      throw new AppError(400, 'This product does not accept a message')
    }

    const cartId = await repo.getOrCreateCartId(userId)
    const existing = await repo.findCartItem(cartId, productId, message)

    const nextQuantity = (existing?.quantity ?? 0) + quantity
    if (nextQuantity > product.stock) {
      throw new AppError(409, 'Not enough stock')
    }

    if (existing) {
      await repo.updateCartItemQuantity(existing.id, nextQuantity)
    } else {
      await repo.createCartItem(cartId, productId, quantity, message)
    }

    return repo.getCartView(userId)
  }
}
