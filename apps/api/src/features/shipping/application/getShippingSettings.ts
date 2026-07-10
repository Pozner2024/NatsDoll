import type { ShippingRepository, ShippingRates } from '../types'

export type GetShippingSettings = () => Promise<ShippingRates>

export function makeGetShippingSettings(repo: ShippingRepository): GetShippingSettings {
  return () => repo.getSettings()
}
