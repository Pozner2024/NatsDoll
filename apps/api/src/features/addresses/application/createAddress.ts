import type { AddressRepository, AddressData, AddressView } from '../types'

export function makeCreateAddress(repo: AddressRepository) {
  return function createAddress(userId: string, data: AddressData): Promise<AddressView> {
    return repo.create(userId, data)
  }
}
