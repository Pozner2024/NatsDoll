import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib/zValidator'
import { requireAuth, requireAdmin } from '../../../shared/middleware'
import type { GetPaymentSettings } from '../application/getPaymentSettings'
import type { UpdatePaymentSettings } from '../application/updatePaymentSettings'

const updateSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  clientId: z.string().max(200).nullable(),
  secret: z.string().max(200).nullable().optional(),
  webhookId: z.string().max(200).nullable().optional(),
})

export function makeAdminPaymentRouter(
  getPaymentSettings: GetPaymentSettings,
  updatePaymentSettings: UpdatePaymentSettings,
) {
  const router = new Hono()
  router.use('*', requireAuth, requireAdmin)

  router.get('/', async (c) => c.json(await getPaymentSettings()))

  router.put('/', zValidator('json', updateSchema), async (c) => {
    await updatePaymentSettings(c.req.valid('json'))
    return c.json(await getPaymentSettings())
  })

  return router
}
