import { Hono } from 'hono'
import { requireAdmin } from '../../../shared/middleware'
import type { GetDashboard, MarkAllMessagesRead } from '../types'

export function makeAdminRouter(
  getDashboard: GetDashboard,
  markAllMessagesRead: MarkAllMessagesRead,
) {
  const router = new Hono()

  router.use('*', requireAdmin)

  router.get('/dashboard', async (c) => {
    const data = await getDashboard()
    return c.json(data)
  })

  router.patch('/messages/mark-all-read', async (c) => {
    await markAllMessagesRead()
    return c.json({ ok: true })
  })

  return router
}
