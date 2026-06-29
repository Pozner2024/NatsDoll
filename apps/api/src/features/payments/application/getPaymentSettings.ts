import type { PaymentRepository, PaymentSettingsView } from '../types'

export type GetPaymentSettings = () => Promise<PaymentSettingsView>

export function makeGetPaymentSettings(repo: PaymentRepository): GetPaymentSettings {
  return async () => {
    const s = await repo.getAdminSettings()
    if (!s) {
      const empty = { clientId: null, hasSecret: false, webhookId: null }
      return { enabled: false, mode: 'SANDBOX', sandbox: { ...empty }, live: { ...empty } }
    }
    return {
      enabled: s.enabled,
      mode: s.mode,
      sandbox: { clientId: s.sandboxClientId, hasSecret: s.sandboxSecret !== null, webhookId: s.sandboxWebhookId },
      live: { clientId: s.liveClientId, hasSecret: s.liveSecret !== null, webhookId: s.liveWebhookId },
    }
  }
}
