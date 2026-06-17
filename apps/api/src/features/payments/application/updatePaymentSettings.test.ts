import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeUpdatePaymentSettings } from './updatePaymentSettings'
import { decryptSecret } from '../infrastructure/secretCrypto'
import type { PaymentRepository } from '../types'

beforeEach(() => { process.env.PAYMENT_ENCRYPTION_KEY = '0'.repeat(64) })

function repoStub(): PaymentRepository & { saved: unknown } {
  const r = {
    saved: null as unknown,
    async getSettings() { return null },
    async upsertSettings(data: unknown) { r.saved = data },
    async getOrderForPayment() { return null },
    async setPaypalOrderId() {},
    async markOrderPaid() {},
  }
  return r
}

describe('updatePaymentSettings', () => {
  it('encrypts secret before saving', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({ enabled: false, mode: 'SANDBOX', clientId: 'cid', secret: 'plain-secret' })
    const saved = repo.saved as { secret?: string }
    const stored = saved.secret as string
    expect(stored).not.toBe('plain-secret')
    expect(decryptSecret(stored)).toBe('plain-secret')
  })

  it('rejects enabling without clientId', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await expect(update({ enabled: true, mode: 'LIVE', clientId: null, secret: undefined })).rejects.toThrow()
  })

  it('passes secret:undefined through (keep existing)', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({ enabled: false, mode: 'SANDBOX', clientId: 'cid', secret: undefined })
    expect((repo.saved as { secret?: unknown }).secret).toBeUndefined()
  })
})
