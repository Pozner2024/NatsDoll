import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib/zValidator'
import { setCookie } from 'hono/cookie'
import { createRateLimiter } from '../../../shared/middleware'
import { COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '../../../shared/lib'
import type { CreateOrder, GetMyOrders, GetOrder } from '../types'
import type { GuestCheckout } from '../application/guestCheckout'

const shippingAddressSchema = z.object({
  fullName: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
})

const createOrderBodySchema = z.object({
  shippingAddress: shippingAddressSchema,
})

const guestItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  message: z.string().max(500).nullable().optional(),
})

const guestCheckoutSchema = z.object({
  email: z.string().email().max(200),
  shippingAddress: shippingAddressSchema,
  items: z.array(guestItemSchema).min(1),
})

const isProduction = process.env.NODE_ENV === 'production'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'Strict',
  maxAge: REFRESH_TOKEN_TTL_SECONDS,
  secure: isProduction,
} as const

const guestLimiter = createRateLimiter({ max: 10, windowMs: 60_000 })

export function makeOrderRouter(
  createOrder: CreateOrder,
  getMyOrders: GetMyOrders,
  getOrder: GetOrder,
  guestCheckout: GuestCheckout,
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

  router.post('/orders/guest', guestLimiter.middleware, zValidator('json', guestCheckoutSchema), async (c) => {
    const body = c.req.valid('json')
    const { order, tokens } = await guestCheckout({
      email: body.email,
      shippingAddress: body.shippingAddress,
      items: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity, message: i.message ?? null })),
    })
    setCookie(c, COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)
    return c.json({ order, accessToken: tokens.accessToken, user: tokens.user }, 201)
  })

  return router
}
