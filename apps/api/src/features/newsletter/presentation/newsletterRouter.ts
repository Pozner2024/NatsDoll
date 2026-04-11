import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const subscribeBodySchema = z.object({
  email: z.string().email(),
})

type Subscribe = (email: string) => Promise<void>

export function makeNewsletterRouter(subscribe: Subscribe) {
  const router = new Hono()

  router.post('/subscribe', zValidator('json', subscribeBodySchema), async (c) => {
    const { email } = c.req.valid('json')
    await subscribe(email)
    return c.json({ message: 'Subscribed' }, 201)
  })

  // Admin routes (GET /subscribers, DELETE /subscribers/:id) are not registered
  // until auth middleware with ADMIN role check is implemented.

  return router
}
