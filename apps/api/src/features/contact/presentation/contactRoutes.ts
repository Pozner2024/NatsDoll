import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createRateLimiter } from '../../../shared/middleware/rateLimit'

const contactBodySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  message: z.string().min(1).max(5000),
})

const contactLimiter = createRateLimiter({ max: 3, windowMs: 60_000 })

type Submit = (data: { name: string; email: string; message: string }) => Promise<void>

export function makeContactRouter(submit: Submit) {
  const router = new Hono()

  router.post('/', contactLimiter.middleware, zValidator('json', contactBodySchema), async (c) => {
    const data = c.req.valid('json')
    await submit(data)
    return c.json({ message: 'Message sent' }, 201)
  })

  return router
}
