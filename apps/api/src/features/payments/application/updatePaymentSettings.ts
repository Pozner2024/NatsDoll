import { AppError } from '../../../shared/errors'
import { encryptSecret } from '../infrastructure/secretCrypto'
import type { PaymentRepository, UpdatePaymentSettingsInput, UpdateModeCredsInput, UpsertModeCreds } from '../types'

export type UpdatePaymentSettings = (input: UpdatePaymentSettingsInput) => Promise<void>

function toUpsertCreds(input: UpdateModeCredsInput): UpsertModeCreds {
  let secret: string | null | undefined
  if (input.secret === undefined) {
    secret = undefined
  } else if (input.secret === null || input.secret === '') {
    secret = null
  } else {
    secret = encryptSecret(input.secret)
  }
  const webhookId = input.webhookId === undefined ? undefined : (input.webhookId || null)
  return { clientId: input.clientId, secret, webhookId }
}

export function makeUpdatePaymentSettings(repo: PaymentRepository): UpdatePaymentSettings {
  return async (input) => {
    const activeClientId = input.mode === 'LIVE' ? input.live.clientId : input.sandbox.clientId
    if (input.enabled && !input.externalPageEnabled && !activeClientId) {
      throw new AppError(400, 'Client ID is required to enable payments')
    }
    await repo.upsertSettings({
      enabled: input.enabled,
      mode: input.mode,
      sandbox: toUpsertCreds(input.sandbox),
      live: toUpsertCreds(input.live),
      externalPageEnabled: input.externalPageEnabled,
    })
  }
}
