import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import type { EmailService } from '../../auth/infrastructure/emailService'
import { alertCaptureUnsettled } from './capturePaypalPayment'
import { matchesAmountUsd } from './matchesAmountUsd'
import type { PaymentRepository } from '../types'

export type HandleWooWebhook = (rawBody: string, signature: string) => Promise<{ handled: boolean }>

const PAID_WOO_STATUSES = ['processing', 'completed']
const TRUSTED_GATEWAY_PREFIXES = ['ppcp-', 'sklad_usa_']

function verifyWooSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
  const received = Buffer.from(signature, 'base64')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

interface WooWebhookEvent {
  id?: unknown
  status?: unknown
  total?: unknown
  currency?: unknown
  transaction_id?: unknown
  payment_method?: unknown
}

export function makeHandleWooWebhook(
  repo: Pick<PaymentRepository, 'getOrderByWooOrderId' | 'markOrderPaid'>,
  emailService: Pick<EmailService, 'sendPaymentCaptureAlert'>,
  webhookSecret: string | undefined,
): HandleWooWebhook {
  return async (rawBody, signature) => {
    if (!webhookSecret || !signature) {
      return { handled: false }
    }
    if (!verifyWooSignature(rawBody, signature, webhookSecret)) {
      throw new AppError(401, 'Invalid webhook signature')
    }
    let event: WooWebhookEvent
    try {
      event = JSON.parse(rawBody) as WooWebhookEvent
    } catch {
      return { handled: false }
    }
    if (typeof event.id !== 'number' || typeof event.status !== 'string' || !PAID_WOO_STATUSES.includes(event.status)) {
      return { handled: false }
    }
    const order = await repo.getOrderByWooOrderId(event.id)
    if (!order) {
      return { handled: false }
    }
    const transactionId = typeof event.transaction_id === 'string' && event.transaction_id !== '' ? event.transaction_id : null
    const amountMatches = matchesAmountUsd(event.total, order.totalAmount)
    const currencyMatches = event.currency === 'USD'
    const paymentMethod = event.payment_method
    const gatewayMatches = typeof paymentMethod === 'string' && TRUSTED_GATEWAY_PREFIXES.some((prefix) => paymentMethod.startsWith(prefix))
    if (!amountMatches || !currencyMatches || !gatewayMatches || transactionId === null) {
      console.error('[handleWooWebhook] payment verification mismatch', {
        orderNumber: order.orderNumber,
        amount: { expected: order.totalAmount.toFixed(2), actual: event.total ?? null, ok: amountMatches },
        currency: { expected: 'USD', actual: event.currency ?? null, ok: currencyMatches },
        gateway: { actual: event.payment_method ?? null, ok: gatewayMatches },
        transactionId: { present: transactionId !== null },
      })
      await alertCaptureUnsettled(emailService, order.orderNumber, transactionId, new AppError(409, 'Payment verification failed'))
      return { handled: false }
    }
    const paid = await repo.markOrderPaid(order.id, transactionId)
    if (!paid) {
      await alertCaptureUnsettled(emailService, order.orderNumber, transactionId, new AppError(409, 'Order went into a final state during payment'))
      return { handled: false }
    }
    return { handled: true }
  }
}
