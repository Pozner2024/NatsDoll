import { AppError } from '../../../shared/errors'
import type { PaypalClient, PaypalCreds, CreatedPaypalOrder, CapturedPayment } from '../types'

function baseUrl(mode: PaypalCreds['mode']): string {
  return mode === 'LIVE' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

async function getAccessToken(creds: PaypalCreds): Promise<string> {
  const auth = Buffer.from(`${creds.clientId}:${creds.secret}`).toString('base64')
  const res = await fetch(`${baseUrl(creds.mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    throw new AppError(502, 'PayPal authentication failed')
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new AppError(502, 'PayPal authentication failed')
  }
  return data.access_token
}

function extractCaptureId(body: unknown): string | null {
  const pu = (body as { purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string }> } }> }).purchase_units
  return pu?.[0]?.payments?.captures?.[0]?.id ?? null
}

export function makePaypalClient(): PaypalClient {
  return {
    async createOrder({ creds, amountUsd, invoiceId }): Promise<CreatedPaypalOrder> {
      const token = await getAccessToken(creds)
      const res = await fetch(`${baseUrl(creds.mode)}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': invoiceId,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            invoice_id: invoiceId,
            custom_id: invoiceId,
            amount: { currency_code: 'USD', value: amountUsd.toFixed(2) },
          }],
        }),
      })
      if (!res.ok) {
        throw new AppError(502, 'Failed to create PayPal order')
      }
      const data = (await res.json()) as { id?: string }
      if (!data.id) {
        throw new AppError(502, 'Failed to create PayPal order')
      }
      return { paypalOrderId: data.id }
    },

    async captureOrder({ creds, paypalOrderId }): Promise<CapturedPayment> {
      const token = await getAccessToken(creds)
      const res = await fetch(`${baseUrl(creds.mode)}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `cap-${paypalOrderId}`,
        },
      })
      const body = (await res.json().catch(() => ({}))) as { status?: string; details?: Array<{ issue?: string }> }
      if (!res.ok) {
        if (body.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED')) {
          return { status: 'COMPLETED', captureId: null }
        }
        throw new AppError(502, 'Failed to capture PayPal payment')
      }
      return { status: body.status ?? 'UNKNOWN', captureId: extractCaptureId(body) }
    },

    async getOrderStatus({ creds, paypalOrderId }): Promise<CapturedPayment> {
      const token = await getAccessToken(creds)
      const res = await fetch(`${baseUrl(creds.mode)}/v2/checkout/orders/${paypalOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new AppError(502, 'Failed to fetch PayPal order')
      }
      const body = (await res.json()) as { status?: string }
      return { status: body.status ?? 'UNKNOWN', captureId: extractCaptureId(body) }
    },
  }
}
