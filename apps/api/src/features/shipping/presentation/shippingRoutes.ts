import { Hono } from 'hono'
import type { GetShippingSettings } from '../application/getShippingSettings'

export function makeShippingRouter(getShippingSettings: GetShippingSettings) {
  const router = new Hono()

  router.get('/', async (c) => c.json(await getShippingSettings()))

  return router
}
