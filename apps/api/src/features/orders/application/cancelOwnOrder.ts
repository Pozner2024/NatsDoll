import { AppError } from '../../../shared/errors'
import type { OrderRepository, CancelOwnOrder } from '../types'

export function makeCancelOwnOrder(repo: OrderRepository): CancelOwnOrder {
  return async function cancelOwnOrder(userId: string, orderId: string): Promise<void> {
    const cancelled = await repo.cancelPendingOrder(userId, orderId)
    if (!cancelled) throw new AppError(409, 'Order cannot be cancelled')
  }
}
