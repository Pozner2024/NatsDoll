import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import { createRateLimiter } from '../../../shared/middleware'
import type { GetMyMessages, CreateMessage } from '../types'

const createMessageSchema = z.object({
  text: z.string().min(1).max(2000),
  orderId: z.string().min(1).max(50).optional(),
})

const ONE_HOUR_MS = 60 * 60_000
const createMessageLimiter = createRateLimiter({ max: 10, windowMs: ONE_HOUR_MS })

export function makeMessageRouter(getMyMessages: GetMyMessages, createMessage: CreateMessage) {
  const router = new Hono()

  router.get('/', async (c) => {
    const { userId } = c.get('auth')
    const messages = await getMyMessages(userId)
    return c.json(messages)
  })

  router.post('/', createMessageLimiter.middleware, zValidator('json', createMessageSchema), async (c) => {
    const { userId } = c.get('auth')
    const data = c.req.valid('json')
    await createMessage(userId, data)
    return c.json({ message: 'Message sent' }, 201)
  })

  return router
}
