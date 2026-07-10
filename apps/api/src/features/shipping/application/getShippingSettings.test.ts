import { describe, it, expect, vi } from 'vitest'
import { makeGetShippingSettings } from './getShippingSettings'
import type { ShippingRepository } from '../types'

describe('getShippingSettings', () => {
  it('returns rates from the repository', async () => {
    const repo: ShippingRepository = {
      getSettings: vi.fn().mockResolvedValue({ baseCost: 15, perExtraItemCost: 5 }),
      upsertSettings: vi.fn(),
    }
    const get = makeGetShippingSettings(repo)
    expect(await get()).toEqual({ baseCost: 15, perExtraItemCost: 5 })
  })
})
