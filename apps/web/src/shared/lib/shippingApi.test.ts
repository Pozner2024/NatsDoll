import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./apiClient', () => ({ apiFetch: vi.fn() }))

import { apiFetch } from './apiClient'
import { fetchShippingSettings } from './shippingApi'

const mockFetch = vi.mocked(apiFetch)

describe('fetchShippingSettings', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns parsed rates from the API', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ baseCost: 15, perExtraItemCost: 3 }) } as Response)
    expect(await fetchShippingSettings()).toEqual({ baseCost: 15, perExtraItemCost: 3 })
  })

  it('falls back to defaults when the request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) } as Response)
    expect(await fetchShippingSettings()).toEqual({ baseCost: 12, perExtraItemCost: 1 })
  })

  it('falls back to defaults when the response shape is invalid', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ nonsense: true }) } as unknown as Response)
    expect(await fetchShippingSettings()).toEqual({ baseCost: 12, perExtraItemCost: 1 })
  })
})
