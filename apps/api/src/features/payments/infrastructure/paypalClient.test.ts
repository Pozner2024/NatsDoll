import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makePaypalClient } from './paypalClient'
import type { PaypalCreds } from '../types'

const creds: PaypalCreds = { clientId: 'cid', secret: 'sec', mode: 'SANDBOX' }

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
  const fn = vi.fn()
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    })
  }
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => vi.unstubAllGlobals())

describe('paypalClient.createOrder', () => {
  it('gets token then creates order and returns id', async () => {
    const fetchFn = mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { id: 'PAYPAL-1' } },
    ])
    const client = makePaypalClient()
    const res = await client.createOrder({ creds, amountUsd: 42.5, invoiceId: 'natsdoll-7' })
    expect(res.paypalOrderId).toBe('PAYPAL-1')
    expect(String(fetchFn.mock.calls[0][0])).toContain('api-m.sandbox.paypal.com')
    const body = JSON.parse(fetchFn.mock.calls[1][1].body)
    expect(body.purchase_units[0].amount.value).toBe('42.50')
    expect(body.purchase_units[0].invoice_id).toBe('natsdoll-7')
  })
})

describe('paypalClient.captureOrder', () => {
  it('returns COMPLETED with captureId', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP-1' }] } }] } },
    ])
    const client = makePaypalClient()
    const res = await client.captureOrder({ creds, paypalOrderId: 'PAYPAL-1' })
    expect(res.status).toBe('COMPLETED')
    expect(res.captureId).toBe('CAP-1')
  })

  it('treats ORDER_ALREADY_CAPTURED as success', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: false, status: 422, body: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } },
    ])
    const client = makePaypalClient()
    const res = await client.captureOrder({ creds, paypalOrderId: 'PAYPAL-1' })
    expect(res.status).toBe('COMPLETED')
  })
})
