import type { AddressRepository, AddressData, AddressView } from '../types'

export function makeUpdateAddress(repo: AddressRepository) {
  return function updateAddress(userId: string, addressId: string, data: Partial<AddressData>): Promise<AddressView> {
    return repo.update(addressId, userId, data)
  }
}
