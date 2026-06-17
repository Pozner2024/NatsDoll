import { AppError } from '../../../shared/errors'
import type { PaymentRepository, PaypalClient } from '../types'
import type { MarkOrderPaid } from './markOrderPaid'

export type CapturePaypalPayment = (userId: string, orderId: string) => Promise<{ status: string }>

export function makeCapturePaypalPayment(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPayment'>,
  paypal: Pick<PaypalClient, 'captureOrder'>,
  markOrderPaid: MarkOrderPaid,
  decrypt: (s: string) => string,
): CapturePaypalPayment {
  return async (userId, orderId) => {
    const settings = await repo.getSettings()
    if (!settings || !settings.clientId || !settings.secret) {
      throw new AppError(409, 'Server-side payment is not available')
    }
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status === 'PAID') {
      return { status: 'COMPLETED' }
    }
    if (!order.paypalOrderId) {
      throw new AppError(409, 'No PayPal order to capture')
    }
    const result = await paypal.captureOrder({
      creds: { clientId: settings.clientId, secret: decrypt(settings.secret), mode: settings.mode },
      paypalOrderId: order.paypalOrderId,
    })
    if (result.status !== 'COMPLETED') {
      throw new AppError(402, 'Payment was not completed')
    }
    await markOrderPaid(orderId, result.captureId)
    return { status: 'COMPLETED' }
  }
}
