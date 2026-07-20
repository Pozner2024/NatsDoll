import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import { createRateLimiter } from '../../../shared/middleware'

const subscribeBodySchema = z.object({
  email: z.string().email().max(254),
})

const emailTokenBodySchema = z.object({
  email: z.string().email().max(254),
  token: z.string().min(1).max(128),
})

const subscribeLimiter = createRateLimiter({ max: 3, windowMs: 60 * 60_000 })
const unsubscribeLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60_000 })
const confirmLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60_000 })

type Subscribe = (email: string) => Promise<void>
type Unsubscribe = (email: string, token: string) => Promise<void>
type Confirm = (email: string, token: string) => Promise<void>

export function makeNewsletterRouter(subscribe: Subscribe, unsubscribe: Unsubscribe, confirm: Confirm) {
  const router = new Hono()

  router.post('/subscribe', subscribeLimiter.middleware, zValidator('json', subscribeBodySchema), async (c) => {
    const { email } = c.req.valid('json')
    await subscribe(email)
    return c.json({ message: 'Subscribed' }, 201)
  })

  router.post('/unsubscribe', unsubscribeLimiter.middleware, zValidator('json', emailTokenBodySchema), async (c) => {
    const { email, token } = c.req.valid('json')
    await unsubscribe(email, token)
    return c.json({ message: 'Unsubscribed' })
  })

  router.post('/confirm', confirmLimiter.middleware, zValidator('json', emailTokenBodySchema), async (c) => {
    const { email, token } = c.req.valid('json')
    await confirm(email, token)
    return c.json({ message: 'Confirmed' })
  })

  return router
}
