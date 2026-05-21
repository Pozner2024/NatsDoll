import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import type { CreateOrder, GetMyOrders, GetOrder } from '../types'

const shippingAddressSchema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().min(1),
})

const createOrderBodySchema = z.object({
  shippingAddress: shippingAddressSchema,
})

export function makeOrderRouter(
  createOrder: CreateOrder,
  getMyOrders: GetMyOrders,
  getOrder: GetOrder,
) {
  const router = new Hono()

  router.post('/orders', zValidator('json', createOrderBodySchema), async (c) => {
    const { userId } = c.get('auth')
    const { shippingAddress } = c.req.valid('json')
    const order = await createOrder(userId, shippingAddress)
    return c.json(order, 201)
  })

  router.get('/orders', async (c) => {
    const { userId } = c.get('auth')
    const orders = await getMyOrders(userId)
    return c.json(orders)
  })

  router.get('/orders/:id', async (c) => {
    const { userId } = c.get('auth')
    const orderId = c.req.param('id')
    const order = await getOrder(userId, orderId)
    return c.json(order)
  })

  return router
}
