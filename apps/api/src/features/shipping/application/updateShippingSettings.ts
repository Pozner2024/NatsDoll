import type { ShippingRepository, ShippingRates } from '../types'

export type UpdateShippingSettings = (input: ShippingRates) => Promise<void>

export function makeUpdateShippingSettings(repo: ShippingRepository): UpdateShippingSettings {
  return (input) => repo.upsertSettings(input)
}
