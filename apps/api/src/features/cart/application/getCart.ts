import type { CartRepository, GetCart } from '../types'
import type { GetActiveSale } from '../../admin/types'
import { applySaleToCart } from './applySaleToCart'

export function makeGetCart(repo: CartRepository, getActiveSale: GetActiveSale): GetCart {
  return async (userId: string) => {
    const [cart, sale] = await Promise.all([repo.getCartView(userId), getActiveSale()])
    return applySaleToCart(cart, sale)
  }
}
