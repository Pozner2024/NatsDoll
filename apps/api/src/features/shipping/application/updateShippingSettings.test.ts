import { describe, it, expect, vi } from 'vitest'
import { makeUpdateShippingSettings } from './updateShippingSettings'
import type { ShippingRepository } from '../types'

describe('updateShippingSettings', () => {
  it('persists the given rates via the repository', async () => {
    const repo: ShippingRepository = {
      getSettings: vi.fn(),
      upsertSettings: vi.fn().mockResolvedValue(undefined),
    }
    const update = makeUpdateShippingSettings(repo)
    await update({ baseCost: 20, perExtraItemCost: 3 })
    expect(repo.upsertSettings).toHaveBeenCalledWith({ baseCost: 20, perExtraItemCost: 3 })
  })
})
