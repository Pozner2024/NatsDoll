import { AppError } from '../../../shared/errors'
import { encryptSecret } from '../infrastructure/secretCrypto'
import type { PaymentRepository, UpdatePaymentSettingsInput } from '../types'

export type UpdatePaymentSettings = (input: UpdatePaymentSettingsInput) => Promise<void>

export function makeUpdatePaymentSettings(repo: PaymentRepository): UpdatePaymentSettings {
  return async (input) => {
    if (input.enabled && !input.clientId) {
      throw new AppError(400, 'Client ID is required to enable payments')
    }
    let secret: string | null | undefined
    if (input.secret === undefined) {
      secret = undefined
    } else if (input.secret === null || input.secret === '') {
      secret = null
    } else {
      secret = encryptSecret(input.secret)
    }
    await repo.upsertSettings({
      enabled: input.enabled,
      mode: input.mode,
      clientId: input.clientId,
      secret,
    })
  }
}
