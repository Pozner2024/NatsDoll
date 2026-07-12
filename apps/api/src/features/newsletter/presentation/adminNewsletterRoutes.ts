import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../../../shared/middleware'
import { FRONTEND_URL } from '../../../shared/lib'
import { unsubscribeToken } from '../application/unsubscribe'
import type { NewsletterSubscriber } from '../infrastructure/newsletterRepository'

type GetSubscribers = () => Promise<NewsletterSubscriber[]>
type DeleteSubscriber = (id: string) => Promise<void>

function unsubscribeUrl(email: string): string {
  return `${FRONTEND_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken(email)}`
}

export function makeAdminNewsletterRouter(getSubscribers: GetSubscribers, deleteSubscriber: DeleteSubscriber) {
  const router = new Hono()
  router.use('*', requireAuth, requireAdmin)

  router.get('/subscribers', async (c) => {
    const subscribers = await getSubscribers()
    return c.json(subscribers.map((s) => ({ ...s, unsubscribeUrl: unsubscribeUrl(s.email) })))
  })

  router.delete('/subscribers/:id', async (c) => {
    await deleteSubscriber(c.req.param('id'))
    return c.json({ ok: true })
  })

  return router
}
