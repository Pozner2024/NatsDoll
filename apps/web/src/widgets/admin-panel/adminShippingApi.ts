import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const settingsSchema = z.object({
  baseCost: z.number(),
  perExtraItemCost: z.number(),
})

export type ShippingSettings = z.infer<typeof settingsSchema>

export async function fetchShippingSettings(): Promise<ShippingSettings> {
  const res = await authFetch('/admin/shipping-settings')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load shipping settings'))
  return settingsSchema.parse(await res.json())
}

export async function saveShippingSettings(body: ShippingSettings): Promise<ShippingSettings> {
  const res = await authFetch('/admin/shipping-settings', { method: 'PUT', json: body })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to save shipping settings'))
  return settingsSchema.parse(await res.json())
}
