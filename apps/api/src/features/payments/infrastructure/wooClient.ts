import { AppError } from '../../../shared/errors'
import type { WooClient, WooCreateOrderInput, WooCreatedOrder } from '../types'

const WOO_ORDERS_PATH = '/wp-json/wc/v3/orders'

interface WooEnv {
  baseUrl: string
  consumerKey: string
  consumerSecret: string
  placeholderProductId: number
}

function readEnv(): WooEnv {
  const baseUrl = process.env.WOO_BASE_URL
  const consumerKey = process.env.WOO_CONSUMER_KEY
  const consumerSecret = process.env.WOO_CONSUMER_SECRET
  const placeholderProductId = Number(process.env.WOO_PLACEHOLDER_PRODUCT_ID)
  if (!baseUrl || !consumerKey || !consumerSecret || !Number.isInteger(placeholderProductId) || placeholderProductId <= 0) {
    throw new AppError(503, 'External payments are not configured')
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), consumerKey, consumerSecret, placeholderProductId }
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

function extractWooError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { code?: unknown; message?: unknown }
    return `code=${String(parsed.code ?? '')} message=${String(parsed.message ?? '')}`
  } catch {
    return body.slice(0, 200)
  }
}

export function makeWooClient(): WooClient {
  return {
    async createOrder(input: WooCreateOrderInput): Promise<WooCreatedOrder> {
      const env = readEnv()
      const { firstName, lastName } = splitName(input.customerName)
      const auth = Buffer.from(`${env.consumerKey}:${env.consumerSecret}`).toString('base64')
      const res = await fetch(`${env.baseUrl}${WOO_ORDERS_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          status: 'pending',
          currency: 'USD',
          customer_id: 0,
          billing: {
            first_name: firstName,
            last_name: lastName,
            email: input.customerEmail,
            address_1: input.billingAddress.line1,
            address_2: input.billingAddress.line2 ?? '',
            city: input.billingAddress.city,
            postcode: input.billingAddress.postalCode,
            country: input.billingAddress.country,
          },
          line_items: input.lineItems.map((li) => ({
            product_id: env.placeholderProductId,
            name: li.name,
            quantity: li.quantity,
            subtotal: li.subtotalUsd.toFixed(2),
            total: li.subtotalUsd.toFixed(2),
          })),
          shipping_lines: [{ method_id: 'flat_rate', method_title: 'Shipping', total: input.shippingUsd.toFixed(2) }],
          meta_data: [
            { key: 'natsdoll_order_number', value: `natsdoll-${input.orderNumber}` },
            { key: 'natsdoll_return_url', value: input.returnUrl },
          ],
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[wooClient] createOrder failed', res.status, extractWooError(body))
        throw new AppError(502, 'Payment page is temporarily unavailable')
      }
      const data = (await res.json()) as { id?: unknown; order_key?: unknown }
      if (typeof data.id !== 'number' || typeof data.order_key !== 'string') {
        throw new AppError(502, 'Payment page is temporarily unavailable')
      }
      return { wooOrderId: data.id, wooOrderKey: data.order_key }
    },

    payUrl(wooOrderId: number, wooOrderKey: string): string {
      const env = readEnv()
      return `${env.baseUrl}/checkout/order-pay/${wooOrderId}/?pay_for_order=true&key=${encodeURIComponent(wooOrderKey)}`
    },
  }
}
