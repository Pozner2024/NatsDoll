import type { PaymentRepository, PublicPaymentConfig } from '../types'

export type GetPaymentConfig = () => Promise<PublicPaymentConfig>

export function makeGetPaymentConfig(repo: PaymentRepository): GetPaymentConfig {
  return async () => {
    const s = await repo.getSettings()
    if (!s || !s.enabled) {
      return { enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false }
    }
    if (s.externalPageEnabled) {
      return { enabled: true, clientId: null, mode: s.mode, serverFlow: false, external: true }
    }
    return { enabled: true, clientId: s.clientId, mode: s.mode, serverFlow: s.secret !== null, external: false }
  }
}
