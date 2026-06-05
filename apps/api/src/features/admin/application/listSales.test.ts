import { describe, it, expect, vi } from 'vitest'
import { makeListSales } from './listSales'
import type { AdminRepository } from '../types'

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    listSales: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AdminRepository
}

describe('listSales', () => {
  it('delegates to repo and returns result', async () => {
    const sales = [{ id: 's1', name: 'Summer', discount: 20, startsAt: '2026-06-01T00:00:00.000Z', endsAt: '2026-06-14T00:00:00.000Z', scope: 'ALL' as const, categoryIds: [], productIds: [], createdAt: '2026-05-01T00:00:00.000Z' }]
    const repo = makeRepo({ listSales: vi.fn().mockResolvedValue(sales) })
    const result = await makeListSales(repo)()
    expect(repo.listSales).toHaveBeenCalled()
    expect(result).toEqual(sales)
  })
})
