import { AppError } from '../../../shared/errors'
import type { PaymentRepository, PaypalClient, PaypalWebhookHeaders } from '../types'
import type { CaptureOrderCore } from './capturePaypalPayment'

export type HandlePaypalWebhook = (rawBody: string, headers: PaypalWebhookHeaders) => Promise<{ handled: boolean }>

interface WebhookEvent {
  event_type?: string
  resource?: {
    id?: string
    invoice_id?: string
    amount?: { value?: string; currency_code?: string }
    purchase_units?: Array<{ invoice_id?: string }>
  }
}

// invoice_id живёт по-разному: на capture-событии — прямо в resource, на order-событии —
// в purchase_units[0]. Метка = natsdoll-<orderNumber>, из неё достаём номер заказа.
function extractOrderNumber(event: WebhookEvent): number | null {
  const tag = event.resource?.invoice_id ?? event.resource?.purchase_units?.[0]?.invoice_id ?? null
  if (!tag) return null
  const match = /^natsdoll-(\d+)$/.exec(tag)
  return match ? Number(match[1]) : null
}

export function makeHandlePaypalWebhook(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPaymentByNumber' | 'markOrderPaid'>,
  paypal: Pick<PaypalClient, 'verifyWebhookSignature'>,
  captureOrderCore: CaptureOrderCore,
  decrypt: (s: string) => string,
): HandlePaypalWebhook {
  return async (rawBody, headers) => {
    const settings = await repo.getSettings()
    // Webhook работает только в server-режиме с заданным id подписки; иначе — молча игнорируем.
    if (!settings || !settings.webhookId || !settings.clientId || !settings.secret) {
      return { handled: false }
    }
    // Эндпоинт неаутентифицирован: отсекаем заведомо «пустые» вызовы до обращения к PayPal,
    // чтобы спам не жёг наши OAuth/verify-запросы (amplification).
    if (!headers.transmissionId || !headers.transmissionSig || !headers.transmissionTime || !headers.certUrl || !headers.authAlgo) {
      return { handled: false }
    }
    // Подлинность входящего уведомления обязательна до любого касания заказа.
    const valid = await paypal.verifyWebhookSignature({
      creds: { clientId: settings.clientId, secret: decrypt(settings.secret), mode: settings.mode },
      webhookId: settings.webhookId,
      headers,
      rawBody,
    })
    if (!valid) {
      throw new AppError(401, 'Invalid webhook signature')
    }

    const event = JSON.parse(rawBody) as WebhookEvent
    const orderNumber = extractOrderNumber(event)
    if (orderNumber === null) return { handled: false }
    const order = await repo.getOrderForPaymentByNumber(orderNumber)
    if (!order) return { handled: false }

    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        await captureOrderCore(order.id)
        return { handled: true }
      case 'PAYMENT.CAPTURE.COMPLETED': {
        // Та же сверка, что в синхронном capture: подтверждаем только если PayPal списал
        // ровно нашу сумму/валюту по нашей метке (defence-in-depth, хоть событие и подписано).
        const amount = event.resource?.amount
        const amountMatches = amount?.value === order.totalAmount.toFixed(2)
        const currencyMatches = amount?.currency_code === 'USD'
        const invoiceMatches = event.resource?.invoice_id === `natsdoll-${order.orderNumber}`
        if (!amountMatches || !currencyMatches || !invoiceMatches) {
          console.error('[handlePaypalWebhook] capture verification mismatch', {
            orderNumber: order.orderNumber,
            amount: { expected: order.totalAmount.toFixed(2), actual: amount?.value ?? null, ok: amountMatches },
            currency: { expected: 'USD', actual: amount?.currency_code ?? null, ok: currencyMatches },
            invoice: { expected: `natsdoll-${order.orderNumber}`, actual: event.resource?.invoice_id ?? null, ok: invoiceMatches },
          })
          return { handled: false }
        }
        await repo.markOrderPaid(order.id, event.resource?.id ?? null)
        return { handled: true }
      }
      default:
        return { handled: false }
    }
  }
}
