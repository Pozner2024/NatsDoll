import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import { requireAuth, requireAdmin } from '../../../shared/middleware'
import type { GetShippingSettings } from '../application/getShippingSettings'
import type { UpdateShippingSettings } from '../application/updateShippingSettings'

const MAX_COST = 1000

const updateSchema = z.object({
  baseCost: z.number().min(0).max(MAX_COST),
  perExtraItemCost: z.number().min(0).max(MAX_COST),
})

export function makeAdminShippingRouter(
  getShippingSettings: GetShippingSettings,
  updateShippingSettings: UpdateShippingSettings,
) {
  const router = new Hono()
  router.use('*', requireAuth, requireAdmin)

  router.get('/', async (c) => c.json(await getShippingSettings()))

  router.put('/', zValidator('json', updateSchema), async (c) => {
    await updateShippingSettings(c.req.valid('json'))
    return c.json(await getShippingSettings())
  })

  return router
}
