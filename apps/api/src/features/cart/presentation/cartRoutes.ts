import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import type { AddToCart, GetCart, UpdateQuantity, RemoveFromCart } from '../types'

const addItemBodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  message: z.string().max(100).nullable().optional().transform((v) => v ?? null),
})

const updateItemBodySchema = z.object({
  quantity: z.number().int().min(1).max(99),
})

export function makeCartRouter(
  addToCart: AddToCart,
  getCart: GetCart,
  updateQuantity: UpdateQuantity,
  removeFromCart: RemoveFromCart,
) {
  const router = new Hono()

  router.get('/', async (c) => {
    const { userId } = c.get('auth')
    const cart = await getCart(userId)
    return c.json(cart)
  })

  router.post('/items', zValidator('json', addItemBodySchema), async (c) => {
    const { userId } = c.get('auth')
    const body = c.req.valid('json')
    const cart = await addToCart({ userId, ...body })
    return c.json(cart)
  })

  router.patch('/items/:id', zValidator('json', updateItemBodySchema), async (c) => {
    const { userId } = c.get('auth')
    const itemId = c.req.param('id')
    const { quantity } = c.req.valid('json')
    const cart = await updateQuantity({ userId, itemId, quantity })
    return c.json(cart)
  })

  router.delete('/items/:id', async (c) => {
    const { userId } = c.get('auth')
    const itemId = c.req.param('id')
    const cart = await removeFromCart(userId, itemId)
    return c.json(cart)
  })

  return router
}
