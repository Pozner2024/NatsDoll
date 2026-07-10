export interface ShippingRates {
  baseCost: number
  perExtraItemCost: number
}

export interface ShippingRepository {
  getSettings(): Promise<ShippingRates>
  upsertSettings(data: ShippingRates): Promise<void>
}
