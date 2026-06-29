import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const modeCredsSchema = z.object({
  clientId: z.string().nullable(),
  hasSecret: z.boolean(),
  webhookId: z.string().nullable(),
})

const settingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  sandbox: modeCredsSchema,
  live: modeCredsSchema,
})

export type PaymentSettings = z.infer<typeof settingsSchema>

export interface UpdateModeCredsBody {
  clientId: string | null
  secret?: string | null
  webhookId?: string | null
}

export interface UpdatePaymentSettingsBody {
  enabled: boolean
  mode: 'SANDBOX' | 'LIVE'
  sandbox: UpdateModeCredsBody
  live: UpdateModeCredsBody
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
