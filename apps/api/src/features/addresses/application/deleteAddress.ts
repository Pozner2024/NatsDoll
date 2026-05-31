import type { AddressRepository } from '../types'

export function makeDeleteAddress(repo: AddressRepository) {
  return async function deleteAddress(userId: string, addressId: string): Promise<void> {
    await repo.delete(addressId, userId)
  }
}
