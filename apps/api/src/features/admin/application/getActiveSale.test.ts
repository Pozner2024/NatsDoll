import { describe, it, expect, vi } from 'vitest'
import { makeGetActiveSale } from './getActiveSale'
import type { AdminRepository } from '../types'

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    getActiveSale: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as AdminRepository
}

describe('getActiveSale', () => {
  it('returns null when no active sale', async () => {
    const repo = makeRepo()
    const result = await makeGetActiveSale(repo)()
    expect(result).toBeNull()
  })

  it('returns active sale data', async () => {
    const activeSale = { discount: 20, scope: 'ALL' as const, categoryIds: [], productIds: [] }
    const repo = makeRepo({ getActiveSale: vi.fn().mockResolvedValue(activeSale) })
    const result = await makeGetActiveSale(repo)()
    expect(result).toEqual(activeSale)
  })
})
