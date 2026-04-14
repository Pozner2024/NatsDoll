import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const contactBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
})

type Submit = (data: { name: string; email: string; message: string }) => Promise<void>

export function makeContactRouter(submit: Submit) {
  const router = new Hono()

  router.post('/', zValidator('json', contactBodySchema), async (c) => {
    const data = c.req.valid('json')
    await submit(data)
    return c.json({ message: 'Message sent' }, 201)
  })

  return router
}
