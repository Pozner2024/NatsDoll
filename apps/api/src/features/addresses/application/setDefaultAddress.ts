import type { AddressRepository } from '../types'

export function makeSetDefaultAddress(repo: AddressRepository) {
  return async function setDefaultAddress(userId: string, addressId: string): Promise<void> {
    await repo.setDefault(addressId, userId)
  }
}
