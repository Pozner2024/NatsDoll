import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const settingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  clientId: z.string().nullable(),
  hasSecret: z.boolean(),
})

export type PaymentSettings = z.infer<typeof settingsSchema>

export interface UpdatePaymentSettingsBody {
  enabled: boolean
  mode: 'SANDBOX' | 'LIVE'
  clientId: string | null
  secret?: string | null
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const res = await authFetch('/admin/payment-settings')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load payment settings'))
  return settingsSchema.parse(await res.json())
}

export async function savePaymentSettings(body: UpdatePaymentSettingsBody): Promise<PaymentSettings> {
  const res = await authFetch('/admin/payment-settings', { method: 'PUT', json: body })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to save payment settings'))
  return settingsSchema.parse(await res.json())
}
