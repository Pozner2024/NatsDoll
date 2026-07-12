import { z } from 'zod'
import { apiFetch } from './apiClient'

const shippingSettingsSchema = z.object({
  baseCost: z.number(),
  perExtraItemCost: z.number(),
})

export type ShippingRates = z.infer<typeof shippingSettingsSchema>

export async function fetchShippingSettings(): Promise<ShippingRates | null> {
  try {
    const res = await apiFetch('/shipping-settings')
    if (!res.ok) return null
    return shippingSettingsSchema.parse(await res.json())
  } catch {
    return null
  }
}
