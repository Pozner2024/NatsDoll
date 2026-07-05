import { describe, it, expect, vi } from 'vitest'
import { makeCreatePaypalOrder } from './createPaypalOrder'

const order = { id: 'o1', userId: 'u1', orderNumber: 7, status: 'PENDING', totalAmount: 42.5, paypalOrderId: null }

function deps(over: Partial<Record<string, unknown>> = {}) {
  return {
    repo: {
      getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'enc' }),
      getOrderForPayment: vi.fn().mockResolvedValue(order),
      setPaypalOrderId: vi.fn().mockResolvedValue(undefined),
      ...((over.repo as object) ?? {}),
    },
    paypal: { createOrder: vi.fn().mockResolvedValue({ paypalOrderId: 'PP-1' }) },
    decrypt: vi.fn().mockReturnValue('plain-secret'),
  }
}

describe('createPaypalOrder', () => {
  it('creates paypal order with natsdoll- invoice and persists id', async () => {
    const d = deps()
    const uc = makeCreatePaypalOrder(d.repo as never, d.paypal as never, d.decrypt as never)
    const res = await uc('u1', 'o1')
    expect(d.paypal.createOrder).toHaveBeenCalledWith({
      creds: { clientId: 'cid', secret: 'plain-secret', mode: 'SANDBOX' },
      amountUsd: 42.5,
      invoiceId: 'natsdoll-7',
    })
    expect(d.repo.setPaypalOrderId).toHaveBeenCalledWith('o1', 'PP-1')
    expect(res.paypalOrderId).toBe('PP-1')
  })

  it('rejects when order belongs to another user', async () => {
    const d = deps()
    const uc = makeCreatePaypalOrder(d.repo as never, d.paypal as never, d.decrypt as never)
    await expect(uc('other', 'o1')).rejects.toThrow()
  })

  it('rejects when secret is missing (client-режим)', async () => {
    const d = deps({ repo: { getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: null }) } })
    const uc = makeCreatePaypalOrder(d.repo as never, d.paypal as never, d.decrypt as never)
    await expect(uc('u1', 'o1')).rejects.toThrow()
  })

  it('rejects when externalPageEnabled and does not call paypal', async () => {
    const d = deps({
      repo: {
        getSettings: vi
          .fn()
          .mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'enc', externalPageEnabled: true }),
      },
    })
    const uc = makeCreatePaypalOrder(d.repo as never, d.paypal as never, d.decrypt as never)
    await expect(uc('u1', 'o1')).rejects.toThrow()
    expect(d.paypal.createOrder).not.toHaveBeenCalled()
    expect(d.repo.setPaypalOrderId).not.toHaveBeenCalled()
  })
})
