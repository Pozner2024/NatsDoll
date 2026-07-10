import { z } from 'zod'
import { apiFetch } from './apiClient'
import { SHIPPING_BASE, SHIPPING_PER_EXTRA_ITEM } from './shipping'

const shippingSettingsSchema = z.object({
  baseCost: z.number(),
  perExtraItemCost: z.number(),
})

export type ShippingRates = z.infer<typeof shippingSettingsSchema>

const DEFAULT_RATES: ShippingRates = {
  baseCost: SHIPPING_BASE,
  perExtraItemCost: SHIPPING_PER_EXTRA_ITEM,
}

export async function fetchShippingSettings(): Promise<ShippingRates> {
  try {
    const res = await apiFetch('/shipping-settings')
    if (!res.ok) return { ...DEFAULT_RATES }
    return shippingSettingsSchema.parse(await res.json())
  } catch {
    return { ...DEFAULT_RATES }
  }
}
