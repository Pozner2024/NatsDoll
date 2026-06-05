import { describe, it, expect, vi } from 'vitest'
import { makeCreateSale } from './createSale'
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
    createSale: vi.fn().mockResolvedValue({ id: 's1' }),
    ...overrides,
  } as unknown as AdminRepository
}

describe('createSale', () => {
  it('creates sale when no overlap', async () => {
    const repo = makeRepo()
    const result = await makeCreateSale(repo)(input)
    expect(repo.createSale).toHaveBeenCalledWith(input)
    expect(result).toEqual({ id: 's1' })
  })

  it('throws when dates overlap with existing sale', async () => {
    const existing = [{
      id: 'old',
      name: 'Spring Sale',
      discount: 10,
      startsAt: '2026-05-28T00:00:00.000Z',
      endsAt: '2026-06-05T00:00:00.000Z',
      scope: 'ALL' as const,
      categoryIds: [],
      productIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    }]
    const repo = makeRepo({ listSales: vi.fn().mockResolvedValue(existing) })
    await expect(makeCreateSale(repo)(input)).rejects.toThrow('overlaps')
  })
})
