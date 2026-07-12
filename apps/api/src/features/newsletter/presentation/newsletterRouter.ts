import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import { createRateLimiter } from '../../../shared/middleware'

const subscribeBodySchema = z.object({
  email: z.string().email().max(254),
})

const unsubscribeBodySchema = z.object({
  email: z.string().email().max(254),
  token: z.string().min(1).max(128),
})

const subscribeLimiter = createRateLimiter({ max: 3, windowMs: 60 * 60_000 })
const unsubscribeLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60_000 })

type Subscribe = (email: string) => Promise<void>
type Unsubscribe = (email: string, token: string) => Promise<void>

export function makeNewsletterRouter(subscribe: Subscribe, unsubscribe: Unsubscribe) {
  const router = new Hono()

  router.post('/subscribe', subscribeLimiter.middleware, zValidator('json', subscribeBodySchema), async (c) => {
    const { email } = c.req.valid('json')
    await subscribe(email)
    return c.json({ message: 'Subscribed' }, 201)
  })

  router.post('/unsubscribe', unsubscribeLimiter.middleware, zValidator('json', unsubscribeBodySchema), async (c) => {
    const { email, token } = c.req.valid('json')
    await unsubscribe(email, token)
    return c.json({ message: 'Unsubscribed' })
  })

  return router
}
