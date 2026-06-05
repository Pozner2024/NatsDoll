import { describe, it, expect, vi } from 'vitest'
import { makeUpdateSale } from './updateSale'
import type { AdminRepository, SaleInput } from '../types'

const input: SaleInput = {
  name: 'Summer Sale',
  discount: 20,
  startsAt: '2026-06-01T00:00:00.000Z',
  endsAt: '2026-06-14T00:00:00.000Z',
  scope: 'ALL',
  categoryIds: [],
  productIds: [],
}

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    listSales: vi.fn().mockResolvedValue([]),
    updateSale: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as AdminRepository
}

describe('updateSale', () => {
  it('updates when no overlap with other sales', async () => {
    const repo = makeRepo()
    await makeUpdateSale(repo)('s1', input)
    expect(repo.updateSale).toHaveBeenCalledWith('s1', input)
  })

  it('ignores overlap with itself', async () => {
    const self = {
      id: 's1',
      name: 'Summer Sale',
      discount: 15,
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-06-14T00:00:00.000Z',
      scope: 'ALL' as const,
      categoryIds: [],
      productIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const repo = makeRepo({ listSales: vi.fn().mockResolvedValue([self]) })
    await expect(makeUpdateSale(repo)('s1', input)).resolves.not.toThrow()
  })

  it('throws when dates overlap with another sale', async () => {
    const other = {
      id: 'other',
      name: 'Spring Sale',
      discount: 10,
      startsAt: '2026-05-28T00:00:00.000Z',
      endsAt: '2026-06-05T00:00:00.000Z',
      scope: 'ALL' as const,
      categoryIds: [],
      productIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const repo = makeRepo({ listSales: vi.fn().mockResolvedValue([other]) })
    await expect(makeUpdateSale(repo)('s1', input)).rejects.toThrow('overlaps')
  })
})
