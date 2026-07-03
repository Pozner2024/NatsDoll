import { AppError } from '../../../shared/errors'
import { isPaidStatus, isTerminalStatus } from '../../../shared/lib'
import type { EmailService } from '../../auth/infrastructure/emailService'
import type { PaymentRepository, PaypalClient } from '../types'
import type { MarkOrderPaid } from './markOrderPaid'

export type CaptureOrderCore = (orderId: string) => Promise<{ status: string }>
export type CapturePaypalPayment = (userId: string, orderId: string) => Promise<{ status: string }>

export async function alertCaptureUnsettled(
  emailService: Pick<EmailService, 'sendPaymentCaptureAlert'>,
  orderNumber: number,
  captureId: string | null,
  err: unknown,
): Promise<void> {
  const reason = err instanceof Error ? err.message : String(err)
  console.error('[paymentAlert] payment captured but order not marked paid', { orderNumber, captureId, reason })
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return
  try {
    await emailService.sendPaymentCaptureAlert(adminEmail, orderNumber, captureId, reason)
  } catch (mailErr) {
    console.error('[paymentAlert] failed to send capture alert email', mailErr)
  }
}

// Ядро capture без проверки владельца: используется и HTTP-путём (через ownership-обёртку),
// и webhook'ом (заказ уже сопоставлен по invoice_id, владелец нерелевантен).
export function makeCaptureOrderCore(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPayment'>,
  paypal: Pick<PaypalClient, 'captureOrder' | 'getOrderStatus'>,
  markOrderPaid: MarkOrderPaid,
  decrypt: (s: string) => string,
  emailService: Pick<EmailService, 'sendPaymentCaptureAlert'>,
): CaptureOrderCore {
  return async (orderId) => {
    const settings = await repo.getSettings()
    if (!settings || !settings.clientId || !settings.secret || settings.externalPageEnabled) {
      throw new AppError(409, 'Server-side payment is not available')
    }
    const order = await repo.getOrderForPayment(orderId)
    if (!order) {
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
    const creds = { clientId: settings.clientId, secret: decrypt(settings.secret), mode: settings.mode }
    const result = await paypal.captureOrder({ creds, paypalOrderId: order.paypalOrderId })
    if (result.status !== 'COMPLETED') {
      throw new AppError(402, 'Payment was not completed')
    }
    // Деньги уже списаны PayPal. Любой сбой ниже оставит заказ неоплаченным в нашей БД —
    // уведомляем админа для ручной сверки и пробрасываем ошибку клиенту.
    try {
      // Сверяем, что PayPal списал ровно ту сумму/валюту/заказ, что мы создали на сервере.
      // details.amount === null бывает при идемпотентном ORDER_ALREADY_CAPTURED — но paypalOrderId
      // мог прийти и через claim, поэтому сверку не пропускаем, а дочитываем детали GET-запросом.
      let details = result
      if (details.amount === null) {
        details = await paypal.getOrderStatus({ creds, paypalOrderId: order.paypalOrderId })
      }
      const amountMatches = details.amount === order.totalAmount.toFixed(2)
      const currencyMatches = details.currencyCode === 'USD'
      const invoiceMatches = details.invoiceId === `natsdoll-${order.orderNumber}`
      if (!amountMatches || !currencyMatches || !invoiceMatches) {
        console.error('[capturePaypalPayment] verification mismatch', {
          orderNumber: order.orderNumber,
          amount: { expected: order.totalAmount.toFixed(2), actual: details.amount, ok: amountMatches },
          currency: { expected: 'USD', actual: details.currencyCode, ok: currencyMatches },
          invoice: { expected: `natsdoll-${order.orderNumber}`, actual: details.invoiceId, ok: invoiceMatches },
        })
        throw new AppError(409, 'Payment verification failed')
      }
      const paid = await markOrderPaid(orderId, result.captureId ?? details.captureId)
      if (!paid) {
        throw new AppError(409, 'Order went into a final state during payment')
      }
    } catch (err) {
      await alertCaptureUnsettled(emailService, order.orderNumber, result.captureId, err)
      throw err
    }
    return { status: 'COMPLETED' }
  }
}

// HTTP-путь: проверяет, что заказ принадлежит вызывающему пользователю, затем делегирует в ядро.
export function makeCapturePaypalPayment(
  repo: Pick<PaymentRepository, 'getOrderForPayment'>,
  captureOrderCore: CaptureOrderCore,
): CapturePaypalPayment {
  return async (userId, orderId) => {
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    return captureOrderCore(orderId)
  }
}
