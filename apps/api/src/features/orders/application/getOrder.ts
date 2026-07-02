import { AppError } from '../../../shared/errors'
import type { OrderRepository, GetOrder, OrderDetail } from '../types'

export function makeGetOrder(repo: OrderRepository): GetOrder {
  return async function getOrder(userId: string, orderId: string): Promise<OrderDetail> {
    const order = await repo.getOrderById(orderId)
    // Чужой заказ отдаём как 404 (не 403): не раскрываем существование id постороннему.
    if (!order || order.userId !== userId) throw new AppError(404, 'Order not found')
    return order
  }
}
