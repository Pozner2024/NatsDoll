import type { PrismaClient } from '@prisma/client'
import { SHIPPING_BASE, SHIPPING_PER_EXTRA_ITEM } from '../../../shared/lib'
import type { ShippingRepository, ShippingRates } from '../types'

const SETTINGS_ID = 'default'

export function makeShippingRepository(prisma: PrismaClient): ShippingRepository {
  return {
    async getSettings(): Promise<ShippingRates> {
      const s = await prisma.shippingSettings.findUnique({ where: { id: SETTINGS_ID } })
      if (!s) {
        return { baseCost: SHIPPING_BASE, perExtraItemCost: SHIPPING_PER_EXTRA_ITEM }
      }
      return {
        baseCost: s.baseCost.toNumber(),
        perExtraItemCost: s.perExtraItemCost.toNumber(),
      }
    },

    async upsertSettings(data: ShippingRates): Promise<void> {
      await prisma.shippingSettings.upsert({
        where: { id: SETTINGS_ID },
        create: {
          id: SETTINGS_ID,
          baseCost: data.baseCost,
          perExtraItemCost: data.perExtraItemCost,
        },
        update: {
          baseCost: data.baseCost,
          perExtraItemCost: data.perExtraItemCost,
        },
      })
    },
  }
}
