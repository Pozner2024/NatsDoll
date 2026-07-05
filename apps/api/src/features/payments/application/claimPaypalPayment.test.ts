import { describe, it, expect, vi } from 'vitest'
import { makeClaimPaypalPayment } from './claimPaypalPayment'

const base = { id: 'o1', userId: 'u1', orderNumber: 7, status: 'PENDING', totalAmount: 10, paypalOrderId: null }
const clientModeSettings = { enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: null, webhookId: null }

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    getSettings: vi.fn().mockResolvedValue(clientModeSettings),
    getOrderForPayment: vi.fn().mockResolvedValue({ ...base }),
    claimPaypalOrder: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('claimPaypalPayment', () => {
  it('records paypalOrderId with the claimed flag when none is set yet', async () => {
    const repo = makeRepo()
    const uc = makeClaimPaypalPayment(repo as never)
    await uc('u1', 'o1', 'PP-NEW')
    expect(repo.claimPaypalOrder).toHaveBeenCalledWith('o1', 'PP-NEW')
  })

  it('rejects claim when payments are disabled', async () => {
    const repo = makeRepo({ getSettings: vi.fn().mockResolvedValue({ ...clientModeSettings, enabled: false }) })
    const uc = makeClaimPaypalPayment(repo as never)
    await expect(uc('u1', 'o1', 'PP')).rejects.toThrow()
    expect(repo.claimPaypalOrder).not.toHaveBeenCalled()
  })

  it('rejects claim when server-side payment is configured (secret present)', async () => {
    const repo = makeRepo({ getSettings: vi.fn().mockResolvedValue({ ...clientModeSettings, secret: 'enc' }) })
    const uc = makeClaimPaypalPayment(repo as never)
    await expect(uc('u1', 'o1', 'PP-ATTACKER')).rejects.toThrow()
    expect(repo.claimPaypalOrder).not.toHaveBeenCalled()
  })

  it('does not overwrite an existing paypalOrderId (anti-substitution)', async () => {
    const repo = makeRepo({ getOrderForPayment: vi.fn().mockResolvedValue({ ...base, paypalOrderId: 'PP-EXISTING' }) })
    const uc = makeClaimPaypalPayment(repo as never)
    await uc('u1', 'o1', 'PP-ATTACKER')
    expect(repo.claimPaypalOrder).not.toHaveBeenCalled()
  })

  it('rejects when order belongs to another user', async () => {
    const repo = makeRepo()
    const uc = makeClaimPaypalPayment(repo as never)
    await expect(uc('other', 'o1', 'PP')).rejects.toThrow()
    expect(repo.claimPaypalOrder).not.toHaveBeenCalled()
  })

  it('ignores claim when order is not PENDING', async () => {
    const repo = makeRepo({ getOrderForPayment: vi.fn().mockResolvedValue({ ...base, status: 'PAID' }) })
    const uc = makeClaimPaypalPayment(repo as never)
    await uc('u1', 'o1', 'PP')
    expect(repo.claimPaypalOrder).not.toHaveBeenCalled()
  })

  it('rejects claim when external payment mode is enabled', async () => {
    const repo = makeRepo({ getSettings: vi.fn().mockResolvedValue({ ...clientModeSettings, externalPageEnabled: true }) })
    const uc = makeClaimPaypalPayment(repo as never)
    await expect(uc('u1', 'o1', 'PP')).rejects.toThrow()
    expect(repo.claimPaypalOrder).not.toHaveBeenCalled()
  })
})
