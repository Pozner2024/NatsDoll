import { describe, it, expect, vi } from 'vitest'
import { makeUpdateCategoryDescription } from './updateCategoryDescription'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    updateCategoryDescription: vi.fn().mockResolvedValue(undefined),
  } as unknown as AdminRepository
}

describe('updateCategoryDescription', () => {
  it('delegates trimmed description to repo', async () => {
    const repo = makeRepo()
    await makeUpdateCategoryDescription(repo)('c1', '  Handmade birthday gifts.  ')
    expect(repo.updateCategoryDescription).toHaveBeenCalledWith('c1', 'Handmade birthday gifts.')
  })
})
