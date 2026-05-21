import { AppError } from '../../../shared/errors'
import type { OrderRepository, GetOrder, OrderDetail } from '../types'

export function makeGetOrder(repo: OrderRepository): GetOrder {
  return async function getOrder(userId: string, orderId: string): Promise<OrderDetail> {
    const order = await repo.getOrderById(orderId)
    if (!order) throw new AppError(404, 'Order not found')
    if (order.userId !== userId) throw new AppError(403, 'Forbidden')
    return order
  }
}
