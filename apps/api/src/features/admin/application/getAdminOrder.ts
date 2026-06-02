import type { AdminRepository, GetAdminOrder } from '../types'

export function makeGetAdminOrder(repo: AdminRepository): GetAdminOrder {
  return (orderId) => repo.getAdminOrder(orderId)
}
