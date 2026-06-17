import type { PaymentRepository, PublicPaymentConfig } from '../types'

export type GetPaymentConfig = () => Promise<PublicPaymentConfig>

export function makeGetPaymentConfig(repo: PaymentRepository): GetPaymentConfig {
  return async () => {
    const s = await repo.getSettings()
    if (!s || !s.enabled) {
      return { enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false }
    }
    return { enabled: true, clientId: s.clientId, mode: s.mode, serverFlow: s.secret !== null }
  }
}
