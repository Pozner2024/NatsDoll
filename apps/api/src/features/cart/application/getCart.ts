import type { CartRepository, GetCart } from '../types'

export function makeGetCart(repo: CartRepository): GetCart {
  return (userId: string) => repo.getCartView(userId)
}
