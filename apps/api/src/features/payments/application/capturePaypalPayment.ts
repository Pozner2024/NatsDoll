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
    // Сверяем, что PayPal списал ровно ту сумму/валюту/заказ, что мы создали на сервере.
    // result.amount === null бывает только при идемпотентном ORDER_ALREADY_CAPTURED — заказ
    // изначально создан нами с серверной суммой, повторная проверка не нужна.
    if (result.amount !== null) {
      const amountMatches = result.amount === order.totalAmount.toFixed(2)
      const currencyMatches = result.currencyCode === 'USD'
      const invoiceMatches = result.invoiceId === `natsdoll-${order.orderNumber}`
      if (!amountMatches || !currencyMatches || !invoiceMatches) {
        throw new AppError(409, 'Payment verification failed')
      }
    }
    await markOrderPaid(orderId, result.captureId)
    return { status: 'COMPLETED' }
  }
}
