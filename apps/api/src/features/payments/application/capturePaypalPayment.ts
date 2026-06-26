import { AppError } from '../../../shared/errors'
import { isPaidStatus, isTerminalStatus } from '../../../shared/lib'
import type { EmailService } from '../../auth/infrastructure/emailService'
import type { PaymentRepository, PaypalClient } from '../types'
import type { MarkOrderPaid } from './markOrderPaid'

export type CapturePaypalPayment = (userId: string, orderId: string) => Promise<{ status: string }>

async function alertCaptureUnsettled(
  emailService: Pick<EmailService, 'sendPaymentCaptureAlert'>,
  orderNumber: number,
  captureId: string | null,
  err: unknown,
): Promise<void> {
  const reason = err instanceof Error ? err.message : String(err)
  console.error('[capturePaypalPayment] payment captured but order not marked paid', { orderNumber, captureId, reason })
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return
  try {
    await emailService.sendPaymentCaptureAlert(adminEmail, orderNumber, captureId, reason)
  } catch (mailErr) {
    console.error('[capturePaypalPayment] failed to send capture alert email', mailErr)
  }
}

export function makeCapturePaypalPayment(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPayment'>,
  paypal: Pick<PaypalClient, 'captureOrder'>,
  markOrderPaid: MarkOrderPaid,
  decrypt: (s: string) => string,
  emailService: Pick<EmailService, 'sendPaymentCaptureAlert'>,
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
    if (isPaidStatus(order.status)) {
      return { status: 'COMPLETED' }
    }
    if (isTerminalStatus(order.status)) {
      throw new AppError(409, 'Order is in a final state')
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
    // Деньги уже списаны PayPal. Любой сбой ниже оставит заказ неоплаченным в нашей БД —
    // уведомляем админа для ручной сверки и пробрасываем ошибку клиенту.
    try {
      // Сверяем, что PayPal списал ровно ту сумму/валюту/заказ, что мы создали на сервере.
      // result.amount === null бывает только при идемпотентном ORDER_ALREADY_CAPTURED — заказ
      // изначально создан нами с серверной суммой, повторная проверка не нужна.
      if (result.amount !== null) {
        const amountMatches = result.amount === order.totalAmount.toFixed(2)
        const currencyMatches = result.currencyCode === 'USD'
        const invoiceMatches = result.invoiceId === `natsdoll-${order.orderNumber}`
        if (!amountMatches || !currencyMatches || !invoiceMatches) {
          console.error('[capturePaypalPayment] verification mismatch', {
            orderNumber: order.orderNumber,
            amount: { expected: order.totalAmount.toFixed(2), actual: result.amount, ok: amountMatches },
            currency: { expected: 'USD', actual: result.currencyCode, ok: currencyMatches },
            invoice: { expected: `natsdoll-${order.orderNumber}`, actual: result.invoiceId, ok: invoiceMatches },
          })
          throw new AppError(409, 'Payment verification failed')
        }
      }
      await markOrderPaid(orderId, result.captureId)
    } catch (err) {
      await alertCaptureUnsettled(emailService, order.orderNumber, result.captureId, err)
      throw err
    }
    return { status: 'COMPLETED' }
  }
}
