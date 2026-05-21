import { z } from 'zod'
import { authFetch } from '@/shared'
import type { ShippingAddress, OrderDetail, OrderSummary } from './types'

const orderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  quantity: z.number(),
  price: z.number(),
  subtotal: z.number(),
  message: z.string().nullable(),
})

const shippingAddressSchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  country: z.string(),
  postalCode: z.string(),
})

const orderDetailSchema = z.object({
  id: z.string(),
  status: z.string(),
  totalAmount: z.number(),
  shippingAddress: shippingAddressSchema,
  createdAt: z.string(),
  items: z.array(orderItemSchema),
})

const orderSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  totalAmount: z.number(),
  itemCount: z.number(),
  createdAt: z.string(),
  firstItemImage: z.string().nullable(),
})

export async function placeOrder(shippingAddress: ShippingAddress): Promise<OrderDetail> {
  const res = await authFetch('/orders', {
    method: 'POST',
    json: { shippingAddress },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? 'Failed to place order')
  }
  return orderDetailSchema.parse(await res.json())
}

export async function fetchMyOrders(): Promise<OrderSummary[]> {
  const res = await authFetch('/orders')
  if (!res.ok) throw new Error('Failed to fetch orders')
  return z.array(orderSummarySchema).parse(await res.json())
}

export async function fetchOrder(orderId: string): Promise<OrderDetail> {
  const res = await authFetch(`/orders/${orderId}`)
  if (!res.ok) throw new Error('Order not found')
  return orderDetailSchema.parse(await res.json())
}
