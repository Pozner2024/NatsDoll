import { AppError } from '../../../shared/errors'
import type { AddressRepository, AddressData, AddressView } from '../types'

const MAX_ADDRESSES = 20

export function makeCreateAddress(repo: AddressRepository) {
  return async function createAddress(userId: string, data: AddressData): Promise<AddressView> {
    const count = await repo.countByUser(userId)
    if (count >= MAX_ADDRESSES) throw new AppError(400, 'Address limit reached, please remove an old address first')
    return repo.create(userId, data)
  }
}
