import type { PaymentRepository, PaymentSettingsView } from '../types'

export type GetPaymentSettings = () => Promise<PaymentSettingsView>

export function makeGetPaymentSettings(repo: PaymentRepository): GetPaymentSettings {
  return async () => {
    const s = await repo.getSettings()
    if (!s) {
      return { enabled: false, mode: 'SANDBOX', clientId: null, hasSecret: false, webhookId: null }
    }
    return { enabled: s.enabled, mode: s.mode, clientId: s.clientId, hasSecret: s.secret !== null, webhookId: s.webhookId }
  }
}
