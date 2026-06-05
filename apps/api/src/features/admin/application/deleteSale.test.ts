import { describe, it, expect, vi } from 'vitest'
import { makeDeleteSale } from './deleteSale'
import type { AdminRepository } from '../types'

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    deleteSale: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as AdminRepository
}

describe('deleteSale', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeDeleteSale(repo)('s1')
    expect(repo.deleteSale).toHaveBeenCalledWith('s1')
  })
})
