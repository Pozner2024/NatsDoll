import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSetDefaultAddress } from './setDefaultAddress'

const repo = {
  findByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  setDefault: vi.fn(),
  countByUser: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('setDefaultAddress', () => {
  it('делегирует в repo.setDefault с порядком (addressId, userId)', async () => {
    repo.setDefault.mockResolvedValue(undefined)
    const setDefaultAddress = makeSetDefaultAddress(repo as any)

    await setDefaultAddress('user-1', 'addr-9')

    expect(repo.setDefault).toHaveBeenCalledWith('addr-9', 'user-1')
  })
})
