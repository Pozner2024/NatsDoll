import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import { requireAuth, requireAdmin } from '../../../shared/middleware'
import type { GetPaymentSettings } from '../application/getPaymentSettings'
import type { UpdatePaymentSettings } from '../application/updatePaymentSettings'

const modeCredsSchema = z.object({
  clientId: z.string().max(200).nullable(),
  secret: z.string().max(200).nullable().optional(),
  webhookId: z.string().max(200).nullable().optional(),
})

const updateSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  sandbox: modeCredsSchema,
  live: modeCredsSchema,
  externalPageEnabled: z.boolean(),
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
