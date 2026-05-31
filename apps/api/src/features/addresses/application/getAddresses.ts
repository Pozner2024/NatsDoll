import type { AddressRepository, AddressView } from '../types'

export function makeGetAddresses(repo: AddressRepository) {
  return function getAddresses(userId: string): Promise<AddressView[]> {
    return repo.findByUser(userId)
  }
}
