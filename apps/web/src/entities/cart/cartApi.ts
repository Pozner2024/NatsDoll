import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'
import type { Cart, CartItem } from './types'

const CartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  unitPrice: z.number(),
  quantity: z.number().int().min(1),
  subtotal: z.number(),
  message: z.string().nullable(),
}) satisfies z.ZodType<CartItem>

const CartSchema = z.object({
  items: z.array(CartItemSchema),
  totalAmount: z.number(),
  itemCount: z.number().int().min(0),
}) satisfies z.ZodType<Cart>

export async function fetchCart(signal?: AbortSignal): Promise<Cart> {
  const res = await authFetch('/cart', { signal })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load cart'))
  return CartSchema.parse(await res.json())
}

export async function addCartItem(input: {
  productId: string
  quantity: number
  message: string | null
}): Promise<Cart> {
  const res = await authFetch('/cart/items', { method: 'POST', json: input })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to add to cart'))
  return CartSchema.parse(await res.json())
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  const res = await authFetch(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    json: { quantity },
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update cart'))
  return CartSchema.parse(await res.json())
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  const res = await authFetch(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to remove item'))
  return CartSchema.parse(await res.json())
}
