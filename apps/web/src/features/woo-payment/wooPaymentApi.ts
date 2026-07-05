import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

export async function createWooPayment(orderId: string): Promise<string> {
  const res = await authFetch('/payments/woo/create-payment', { method: 'POST', json: { orderId } })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to start payment'))
  return z.object({ payUrl: z.string().min(1) }).parse(await res.json()).payUrl
}
