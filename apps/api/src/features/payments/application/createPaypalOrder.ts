import { AppError } from '../../../shared/errors'
import type { PaymentRepository, PaypalClient } from '../types'

export type CreatePaypalOrder = (userId: string, orderId: string) => Promise<{ paypalOrderId: string }>

export function makeCreatePaypalOrder(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPayment' | 'setPaypalOrderId'>,
  paypal: Pick<PaypalClient, 'createOrder'>,
  decrypt: (s: string) => string,
): CreatePaypalOrder {
  return async (userId, orderId) => {
    const settings = await repo.getSettings()
    if (!settings || !settings.enabled || !settings.clientId) {
      throw new AppError(409, 'Payments are not configured')
    }
    if (!settings.secret) {
      throw new AppError(409, 'Server-side payment is not available')
    }
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status !== 'PENDING') {
      throw new AppError(409, 'Order is not awaiting payment')
    }
    const { paypalOrderId } = await paypal.createOrder({
      creds: { clientId: settings.clientId, secret: decrypt(settings.secret), mode: settings.mode },
      amountUsd: order.totalAmount,
      invoiceId: `natsdoll-${order.orderNumber}`,
    })
    await repo.setPaypalOrderId(orderId, paypalOrderId)
    return { paypalOrderId }
  }
}
