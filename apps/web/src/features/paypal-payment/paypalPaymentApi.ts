import { z } from 'zod'
import { apiFetch, authFetch, apiErrorMessage } from '@/shared'

const configSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().nullable(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  serverFlow: z.boolean(),
  external: z.boolean(),
})

export type PaymentConfig = z.infer<typeof configSchema>

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const res = await apiFetch('/payments/config')
  if (!res.ok) throw new Error('Failed to load payment config')
  return configSchema.parse(await res.json())
}

export async function createServerPaypalOrder(orderId: string): Promise<string> {
  const res = await authFetch('/payments/paypal/create-order', { method: 'POST', json: { orderId } })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to create PayPal order'))
  return z.object({ paypalOrderId: z.string() }).parse(await res.json()).paypalOrderId
}

export async function captureServerPayment(orderId: string): Promise<void> {
  const res = await authFetch('/payments/paypal/capture', { method: 'POST', json: { orderId } })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Payment capture failed'))
}

export async function claimClientPayment(orderId: string, paypalOrderId: string): Promise<void> {
  const res = await authFetch('/payments/paypal/claim', { method: 'POST', json: { orderId, paypalOrderId } })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to record payment'))
}
