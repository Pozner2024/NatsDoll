import { describe, it, expect, beforeEach } from 'vitest'
import { makeUpdatePaymentSettings } from './updatePaymentSettings'
import { decryptSecret } from '../infrastructure/secretCrypto'
import type { PaymentRepository, UpsertPaymentSettingsData } from '../types'

beforeEach(() => { process.env.PAYMENT_ENCRYPTION_KEY = '0'.repeat(64) })

function repoStub(): PaymentRepository & { saved: UpsertPaymentSettingsData | null } {
  const r = {
    saved: null as UpsertPaymentSettingsData | null,
    async getSettings() { return null },
    async getAdminSettings() { return null },
    async upsertSettings(data: UpsertPaymentSettingsData) { r.saved = data },
    async getOrderForPayment() { return null },
    async getOrderForPaymentByNumber() { return null },
    async setPaypalOrderId() {},
    async claimPaypalOrder() {},
    async markOrderPaid() { return true },
    async getOrderForWooPayment() { return null },
    async setWooOrder() { return true },
    async getOrderByWooOrderId() { return null },
  }
  return r
}

const emptyCreds = { clientId: null, secret: undefined, webhookId: undefined }

describe('updatePaymentSettings', () => {
  it('encrypts each mode secret independently before saving', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({
      enabled: false,
      mode: 'SANDBOX',
      sandbox: { clientId: 'sb-cid', secret: 'sandbox-secret', webhookId: undefined },
      live: { clientId: 'lv-cid', secret: 'live-secret', webhookId: undefined },
      externalPageEnabled: false,
    })
    const saved = repo.saved!
    expect(saved.sandbox.secret).not.toBe('sandbox-secret')
    expect(decryptSecret(saved.sandbox.secret as string)).toBe('sandbox-secret')
    expect(decryptSecret(saved.live.secret as string)).toBe('live-secret')
  })

  it('rejects enabling when the ACTIVE mode has no clientId (sandbox set, live empty)', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await expect(update({
      enabled: true,
      mode: 'LIVE',
      sandbox: { clientId: 'sb-cid', secret: undefined, webhookId: undefined },
      live: { clientId: null, secret: undefined, webhookId: undefined },
      externalPageEnabled: false,
    })).rejects.toThrow()
  })

  it('allows enabling when the active mode has a clientId', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({
      enabled: true,
      mode: 'SANDBOX',
      sandbox: { clientId: 'sb-cid', secret: undefined, webhookId: undefined },
      live: { ...emptyCreds },
      externalPageEnabled: false,
    })
    expect(repo.saved!.enabled).toBe(true)
  })

  it('passes secret:undefined through (keep existing) per mode', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({
      enabled: false,
      mode: 'SANDBOX',
      sandbox: { clientId: 'sb-cid', secret: undefined, webhookId: undefined },
      live: { ...emptyCreds },
      externalPageEnabled: false,
    })
    expect(repo.saved!.sandbox.secret).toBeUndefined()
  })

  it('passes secret:null through as clear', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({
      enabled: false,
      mode: 'SANDBOX',
      sandbox: { clientId: 'sb-cid', secret: null, webhookId: undefined },
      live: { ...emptyCreds },
      externalPageEnabled: false,
    })
    expect(repo.saved!.sandbox.secret).toBeNull()
  })
})
