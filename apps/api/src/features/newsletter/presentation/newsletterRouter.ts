import { Hono } from 'hono'
import { z } from 'zod'
import { ValidationError } from '../../../shared/errors'
import type { NewsletterSubscriber } from '../infrastructure/newsletterRepository'

const subscribeBodySchema = z.object({
  email: z.string().email(),
})

type Subscribe = (email: string) => Promise<void>
type GetSubscribers = () => Promise<NewsletterSubscriber[]>
type DeleteSubscriber = (id: string) => Promise<void>

export function makeNewsletterRouter(
  subscribe: Subscribe,
  getSubscribers: GetSubscribers,
  deleteSubscriber: DeleteSubscriber,
) {
  const router = new Hono()

  router.post('/subscribe', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = subscribeBodySchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('Invalid email')

    await subscribe(parsed.data.email)
    return c.json({ message: 'Subscribed' }, 201)
  })

  router.get('/subscribers', async (c) => {
    // TODO: проверка роли ADMIN — добавить когда будет auth middleware
    const subscribers = await getSubscribers()
    return c.json(subscribers)
  })

  router.delete('/subscribers/:id', async (c) => {
    // TODO: проверка роли ADMIN — добавить когда будет auth middleware
    const id = c.req.param('id')
    await deleteSubscriber(id)
    return c.json({ message: 'Deleted' })
  })

  return router
}
