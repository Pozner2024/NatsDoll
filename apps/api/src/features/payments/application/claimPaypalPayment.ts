import { AppError } from '../../../shared/errors'
import type { PaymentRepository } from '../types'

export type ClaimPaypalPayment = (userId: string, orderId: string, paypalOrderId: string) => Promise<void>

export function makeClaimPaypalPayment(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPayment' | 'claimPaypalOrder'>,
): ClaimPaypalPayment {
  return async (userId, orderId, paypalOrderId) => {
    const settings = await repo.getSettings()
    if (!settings?.enabled || settings.secret) {
      throw new AppError(409, 'Claim is not available')
    }
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status !== 'PENDING') {
      return
    }
    // Не перезаписываем уже привязанный PayPal-заказ: в client-режиме (Secret нет)
    // подтвердить платёж через PayPal API нельзя, поэтому claim лишь фиксирует первый
    // присланный id; повторный/чужой id игнорируется, чтобы его нельзя было подменить.
    if (order.paypalOrderId) {
      return
    }
    await repo.claimPaypalOrder(orderId, paypalOrderId)
  }
}
