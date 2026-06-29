import { z } from 'zod'
import { apiFetch, apiErrorMessage } from '@/shared'
import { useAuthStore } from '@/entities/user'
import { useCartStore } from '@/entities/cart'

export class GuestEmailTakenError extends Error {
  constructor() {
    super('An account with this email exists. Please sign in.')
    this.name = 'GuestEmailTakenError'
  }
}

const guestOrderResponseSchema = z.object({
  order: z.object({
    id: z.string(),
    orderNumber: z.number(),
  }),
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['CUSTOMER', 'ADMIN']),
  }),
})

export interface ShippingAddress {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export interface GuestOrderInput {
  email: string
  shippingAddress: ShippingAddress
  items: { productId: string; quantity: number; message: string | null }[]
}

export async function createGuestOrder(input: GuestOrderInput): Promise<{ orderId: string; orderNumber: number }> {
  const res = await apiFetch('/orders/guest', { method: 'POST', json: input })

  if (res.status === 409) {
    throw new GuestEmailTakenError()
  }

  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, 'Failed to place guest order'))
  }

  const body = guestOrderResponseSchema.parse(await res.json())
  // Гостевые товары уже committed в созданный заказ — чистим localStorage сразу,
  // чтобы при брошенной оплате они не «осиротели» и не слились повторно при
  // следующем входе. setAuth с mergeGuestCart:false поэтому грузит серверную корзину.
  useCartStore().reset()
  useAuthStore().setAuth(body.accessToken, body.user, { mergeGuestCart: false })

  return { orderId: body.order.id, orderNumber: body.order.orderNumber }
}
