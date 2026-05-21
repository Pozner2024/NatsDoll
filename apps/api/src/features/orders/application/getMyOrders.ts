import type { OrderRepository, GetMyOrders } from '../types'

export function makeGetMyOrders(repo: OrderRepository): GetMyOrders {
  return (userId: string) => repo.getMyOrders(userId)
}
