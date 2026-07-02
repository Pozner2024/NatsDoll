import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import type { GetAddresses, CreateAddress, UpdateAddress, DeleteAddress, SetDefaultAddress } from '../types'

const addressSchema = z.object({
  fullName: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
})

const updateAddressSchema = addressSchema.partial()

export function makeAddressRouter(
  getAddresses: GetAddresses,
  createAddress: CreateAddress,
  updateAddress: UpdateAddress,
  deleteAddress: DeleteAddress,
  setDefaultAddress: SetDefaultAddress,
) {
  const router = new Hono()

  router.get('/', async (c) => {
    const { userId } = c.get('auth')
    const addresses = await getAddresses(userId)
    return c.json(addresses)
  })

  router.post('/', zValidator('json', addressSchema), async (c) => {
    const { userId } = c.get('auth')
    const data = c.req.valid('json')
    const address = await createAddress(userId, data)
    return c.json(address, 201)
  })

  router.patch('/:id', zValidator('json', updateAddressSchema), async (c) => {
    const { userId } = c.get('auth')
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const address = await updateAddress(userId, id, data)
    return c.json(address)
  })

  router.delete('/:id', async (c) => {
    const { userId } = c.get('auth')
    const id = c.req.param('id')
    await deleteAddress(userId, id)
    return c.body(null, 204)
  })

  router.post('/:id/default', async (c) => {
    const { userId } = c.get('auth')
    const id = c.req.param('id')
    await setDefaultAddress(userId, id)
    return c.body(null, 204)
  })

  return router
}
