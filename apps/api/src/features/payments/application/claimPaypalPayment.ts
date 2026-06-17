import { AppError } from '../../../shared/errors'
import type { PaymentRepository } from '../types'

export type ClaimPaypalPayment = (userId: string, orderId: string, paypalOrderId: string) => Promise<void>

export function makeClaimPaypalPayment(
  repo: Pick<PaymentRepository, 'getOrderForPayment' | 'setPaypalOrderId'>,
): ClaimPaypalPayment {
  return async (userId, orderId, paypalOrderId) => {
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status !== 'PENDING') {
      return
    }
    await repo.setPaypalOrderId(orderId, paypalOrderId)
  }
}
