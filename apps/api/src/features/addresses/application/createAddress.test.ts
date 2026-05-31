import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateAddress } from './createAddress'

const addressData = {
  fullName: 'Alice Smith',
  line1: '10 Main St',
  city: 'London',
  country: 'UK',
  postalCode: 'SW1A 1AA',
}

const repo = {
  findByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  setDefault: vi.fn(),
  countByUser: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('createAddress', () => {
  it('creates address and returns it', async () => {
    const created = { id: 'a1', ...addressData, isDefault: true, createdAt: new Date().toISOString() }
    repo.create.mockResolvedValue(created)

    const createAddress = makeCreateAddress(repo as any)
    const result = await createAddress('u1', addressData)

    expect(repo.create).toHaveBeenCalledWith('u1', addressData)
    expect(result.id).toBe('a1')
  })
})
